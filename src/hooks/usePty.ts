import { useCallback } from "react";
import {
  spawnPty,
  killPty,
  getDefaultShell,
  writePty,
  findNewClaudeSession,
} from "../lib/tauri";
import { useThemeStore } from "../stores/useThemeStore";
import { hexLuminance } from "../lib/themes";
import type { PtyOutput, CommandConfig, SessionMode } from "../lib/types";
import { toPtyColorTheme } from "../lib/ptyColorTheme";
import { useCommandStore } from "../stores/useCommandStore";
import { useTerminalStore, nextTabId, registerTabCleanup, runTabCleanup } from "../stores/useTerminalStore";
import { useRepoStore } from "../stores/useRepoStore";
import { useNoticeStore } from "../stores/useNoticeStore";
import { CODING_ASSISTANTS } from "../components/sidebar/constants";
import type { Terminal } from "@xterm/xterm";
import { getErrorMessage } from "../lib/errors";
import { buildMcpInjection } from "../lib/mcpConfig";

// Map ptyId -> xterm instance for writing output
const terminalInstances = new Map<number, Terminal>();

// Buffer for PTY output that arrives before terminal is registered
const pendingOutput = new Map<number, string[]>();

// Batch buffer for coalescing rapid PTY writes into single animation frames.
// Prevents screen tearing when TUI apps (Claude Code, opencode) send screen
// redraws larger than the 4KB PTY read buffer — without batching, xterm
// renders intermediate states where only the top of the screen is drawn.
const writeBatch = new Map<number, string[]>();
const writeBatchScheduled = new Set<number>();

// Debounce timers for activity detection — clears "active" after 3s of silence.
// Activity state is tracked here (not in the store) on every data event to avoid
// high-frequency store updates during AI streaming. The store is only updated
// on transitions: idle→active and active→idle.
const activityTimers = new Map<number, ReturnType<typeof setTimeout>>();
const activityActive = new Set<number>();
const ACTIVITY_TIMEOUT = 3000;
const stoppingPtys = new Set<number>();

function cleanupActivityState(ptyId: number) {
  const timer = activityTimers.get(ptyId);
  if (timer) { clearTimeout(timer); activityTimers.delete(ptyId); }
  activityActive.delete(ptyId);
}

// Track in-flight forked-session pollers so we don't spawn duplicates if a
// rapid sequence of branchTab calls hits the same tab id (paranoid; tab ids
// are monotonic).
const forkedSessionPollers = new Set<string>();

/**
 * After a `--fork-session` launch, Claude lazily creates a new session UUID
 * once it produces its first response. The new session's filename appears at
 * `~/.claude/projects/<encoded-repo>/<new-id>.jsonl`. This poller asks Rust to
 * find that file, then writes the discovered ID back onto the tab so future
 * branches from this tab work. Silent give-up after 5 minutes.
 */
async function pollForForkedSessionId(
  tabId: string,
  repoPath: string,
  spawnTimeMs: number,
) {
  if (forkedSessionPollers.has(tabId)) return;
  forkedSessionPollers.add(tabId);

  const POLL_INTERVAL_MS = 2000;
  const TIMEOUT_MS = 5 * 60 * 1000;
  const deadline = spawnTimeMs + TIMEOUT_MS;

  try {
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      // Re-read tab state every iteration so we always exclude up-to-date
      // sibling session IDs and bail if the tab was closed mid-poll.
      const state = useTerminalStore.getState();
      const tabs = state.projectState[repoPath]?.tabs ?? [];
      const target = tabs.find((t) => t.id === tabId);
      if (!target) return;
      if (
        (target.kind === "assistant" || target.kind === "terminal") &&
        target.sessionId
      ) {
        return;
      }

      const knownIds: string[] = [];
      for (const t of tabs) {
        if (
          (t.kind === "assistant" || t.kind === "terminal") &&
          "sessionId" in t &&
          t.sessionId
        ) {
          knownIds.push(t.sessionId);
        }
      }

      let newId: string | null = null;
      try {
        newId = await findNewClaudeSession(repoPath, knownIds, spawnTimeMs);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn("findNewClaudeSession failed (will retry):", e);
        }
        continue;
      }

      if (newId) {
        useTerminalStore.getState().updateTab(tabId, { sessionId: newId });
        return;
      }
    }
  } finally {
    forkedSessionPollers.delete(tabId);
  }
}

export function registerTerminal(ptyId: number, term: Terminal) {
  terminalInstances.set(ptyId, term);
}

export function flushPendingOutput(ptyId: number) {
  const term = terminalInstances.get(ptyId);
  if (!term) return;

  // Flush any buffered output
  const buffered = pendingOutput.get(ptyId);
  if (buffered) {
    term.write(buffered.join(""));
    pendingOutput.delete(ptyId);
  }
}

export function unregisterTerminal(ptyId: number) {
  terminalInstances.delete(ptyId);
  pendingOutput.delete(ptyId);
  writeBatch.delete(ptyId);
  writeBatchScheduled.delete(ptyId);
}

function writeToPty(ptyId: number, data: string) {
  const term = terminalInstances.get(ptyId);
  if (term) {
    // Accumulate data and flush once per animation frame so xterm processes
    // a complete (or near-complete) screen update before the renderer paints.
    let batch = writeBatch.get(ptyId);
    if (!batch) {
      batch = [];
      writeBatch.set(ptyId, batch);
    }
    batch.push(data);

    if (!writeBatchScheduled.has(ptyId)) {
      writeBatchScheduled.add(ptyId);
      requestAnimationFrame(() => {
        writeBatchScheduled.delete(ptyId);
        const chunks = writeBatch.get(ptyId);
        if (chunks && chunks.length > 0) {
          term.write(chunks.join(""));
          chunks.length = 0;
        }
      });
    }
  } else {
    // Terminal not mounted yet — buffer the output
    let buf = pendingOutput.get(ptyId);
    if (!buf) {
      buf = [];
      pendingOutput.set(ptyId, buf);
    }
    buf.push(data);
  }
}

function resolveCommandCwd(repoPath: string, commandCwd: string | null) {
  const trimmed = commandCwd?.trim();
  if (!trimmed) return repoPath;
  const relativePath = trimmed.replace(/^\.?\//, "").replace(/^\/+/, "");
  return `${repoPath}/${relativePath}`;
}

export function usePty() {
  const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const {
    setCommandStatus,
    setCommandPtyId,
    setCommandStatusForProject,
    setCommandPtyIdForProject,
  } = useCommandStore.getState();
  const { addTab, removeTab, findTabByCommand, setActiveTab, initActivity, setTabActive, setTabExited, removeActivity } =
    useTerminalStore.getState();

  const handlePtyMessage = useCallback(
    (
      ptyId: number,
      commandName: string | null,
      repoPath: string,
      msg: PtyOutput,
    ) => {
      if (msg.event === "data") {
        writeToPty(ptyId, msg.data);

        // Only update the store on the idle→active transition, not on every chunk.
        if (!activityActive.has(ptyId)) {
          activityActive.add(ptyId);
          setTabActive(ptyId, true);
        }

        // Reset the idle timer — after 3s of no output, mark as inactive
        const existing = activityTimers.get(ptyId);
        if (existing) clearTimeout(existing);
        activityTimers.set(ptyId, setTimeout(() => {
          activityActive.delete(ptyId);
          setTabActive(ptyId, false);
          activityTimers.delete(ptyId);
        }, ACTIVITY_TIMEOUT));
      } else if (msg.event === "exit") {
        cleanupActivityState(ptyId);
        setTabExited(ptyId, msg.data.code);
        const stoppedByUser = stoppingPtys.delete(ptyId);
        if (commandName) {
          const command = useCommandStore.getState().projectCommands[repoPath]
            ?.find((entry) => entry.name === commandName);
          const nextStatus = stoppedByUser || msg.data.code === 0 ? "stopped" : "crashed";
          if (command?.status !== "stopped" || nextStatus === "crashed") {
            setCommandStatusForProject(repoPath, commandName, nextStatus);
          }
          setCommandPtyIdForProject(repoPath, commandName, null);
        }
      }
    },
    [setCommandStatusForProject, setCommandPtyIdForProject, setTabActive, setTabExited],
  );

  const spawnSession = useCallback(
    async (
      command: string,
      commandArgs: string[] | null,
      env: Record<string, string>,
      cols: number,
      rows: number,
      commandName: string | null,
      repoPath: string,
    ) => {
      let resolvedPtyId: number | null = null;
      const bufferedMessages: PtyOutput[] = [];

      // Signal terminal background brightness to CLI tools via COLORFGBG.
      // Claude Code uses this to resolve "auto" theme when OSC 11 is unavailable.
      const theme = useThemeStore.getState().theme;
      const lum = hexLuminance(theme.appBg);
      const colorfgbg = lum > 0.3 ? "0;15" : "15;0";
      const fullEnv = { COLORFGBG: colorfgbg, ...env };

      const ptyId = await spawnPty(
        command,
        commandArgs,
        repoPath,
        fullEnv,
        cols,
        rows,
        toPtyColorTheme(theme),
        (msg) => {
          if (resolvedPtyId === null) {
            bufferedMessages.push(msg);
            return;
          }

          handlePtyMessage(resolvedPtyId, commandName, repoPath, msg);
        },
      );

      resolvedPtyId = ptyId;
      initActivity(ptyId);

      for (const msg of bufferedMessages) {
        handlePtyMessage(ptyId, commandName, repoPath, msg);
      }

      return ptyId;
    },
    [handlePtyMessage, initActivity],
  );

  const startCommand = useCallback(
    async (command: CommandConfig, cols: number, rows: number, opts?: { restoreId?: string; restoreLabel?: string }) => {
      if (!activeRepoPath) return;
      const commandName = command.name;

      const basePath = activeRepoPath;

      try {
        const ptyId = await spawnSession(
          command.command,
          null,
          command.env,
          cols,
          rows,
          commandName,
          resolveCommandCwd(basePath, command.cwd ?? null),
        );
        if (!ptyId) return;

        setCommandStatus(commandName, "running");
        setCommandPtyId(commandName, ptyId);

        const existing = findTabByCommand(commandName);
        if (existing) {
          setActiveTab(existing.id);
        } else {
          const id = opts?.restoreId ?? nextTabId();
          addTab({
            id,
            kind: "terminal",
            label: opts?.restoreLabel ?? commandName,
            ptyId,
            repoPath: activeRepoPath,
            commandName,
            assistantId: null,
            sessionMode: null,
            sessionId: null,
          });
        }

        return ptyId;
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error(`Failed to start command "${commandName}":`, e);
        }
        pushNotice({
          tone: "error",
          title: `Couldn’t start ${commandName}`,
          message: getErrorMessage(e),
        });
        return null;
      }
    },
    [
      activeRepoPath,
      spawnSession,
      setCommandStatus,
      setCommandPtyId,
      findTabByCommand,
      setActiveTab,
      addTab,
      pushNotice,
    ],
  );

  const stopCommand = useCallback(
    async (commandName: string) => {
      const path = useCommandStore.getState().activeProjectPath;
      if (!path) return;
      const state = useTerminalStore.getState();
      const commands = useCommandStore.getState().projectCommands[path] ?? [];
      const command = commands.find((c) => c.name === commandName);
      const tab = state.getAllProjectTabs(path).find((t) => (t.kind === "terminal" || t.kind === "assistant") && t.commandName === commandName);
      if (command?.ptyId) {
        cleanupActivityState(command.ptyId);
        stoppingPtys.add(command.ptyId);
        await killPty(command.ptyId).catch(() => {
          stoppingPtys.delete(command.ptyId!);
        });
        unregisterTerminal(command.ptyId);
        removeActivity(command.ptyId);
      }
      if (tab) {
        await runTabCleanup(tab.id);
        removeTab(tab.id);
      }
      setCommandStatus(commandName, "stopped");
      setCommandPtyId(commandName, null);
    },
    [setCommandStatus, setCommandPtyId, removeTab, removeActivity],
  );

  const restartCommand = useCallback(
    async (command: CommandConfig, cols: number, rows: number) => {
      await stopCommand(command.name);
      return startCommand(command, cols, rows);
    },
    [stopCommand, startCommand],
  );

  const spawnBlankShell = useCallback(
    async (cols: number, rows: number, opts?: { restoreId?: string; restoreLabel?: string }) => {
      if (!activeRepoPath) return;

      try {
        const shell = await getDefaultShell();
        const ptyId = await spawnSession(
          `${shell} -l`,
          null,
          {},
          cols,
          rows,
          null,
          activeRepoPath,
        );
        if (!ptyId) return;

        const id = opts?.restoreId ?? nextTabId();
        addTab({
          id,
          kind: "terminal",
          label: opts?.restoreLabel ?? "Terminal",
          ptyId,
          repoPath: activeRepoPath,
          commandName: null,
          assistantId: null,
          sessionMode: null,
          sessionId: null,
        });

        return ptyId;
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error("Failed to spawn shell:", e);
        }
        pushNotice({
          tone: "error",
          title: "Couldn’t open shell",
          message: getErrorMessage(e),
        });
        return null;
      }
    },
    [activeRepoPath, spawnSession, addTab, pushNotice],
  );

  const launchAssistant = useCallback(
    async (
      assistantId: string,
      cols: number,
      rows: number,
      mode: SessionMode = "standard",
      model?: string,
      resumeSessionId?: string,
      opts?: { restoreId?: string; restoreLabel?: string; forkFromSessionId?: string },
    ) => {
      if (!activeRepoPath) return;
      const assistant = CODING_ASSISTANTS.find((a) => a.id === assistantId);
      if (!assistant) return;

      const commandArgs: string[] = [];
      let tabSessionId: string | null = null;

      if (model) {
        commandArgs.push(assistant.modelFlag, model);
      }

      if (opts?.forkFromSessionId) {
        commandArgs.push("--resume", opts.forkFromSessionId, "--fork-session");
        tabSessionId = null;  // Forked session creates a new ID we don't know yet.
      } else if (resumeSessionId) {
        commandArgs.push("--resume", resumeSessionId);
        tabSessionId = resumeSessionId;
      } else if (assistant.sessionIdFlag) {
        const uuid = crypto.randomUUID();
        commandArgs.push(assistant.sessionIdFlag, uuid);
        tabSessionId = uuid;
      }

      if (mode === "yolo" && assistant.yoloFlag) {
        commandArgs.push(assistant.yoloFlag);
      }

      // Compute the tab ID early so we can register MCP cleanup against it.
      const id = opts?.restoreId ?? nextTabId();

      // Only inject the Shep MCP server for Claude tabs. Other assistants
      // (codex, gemini, …) handle MCP differently or not at all. Always
      // attempt injection — including for restored tabs, since the previous
      // session's token is gone.
      if (assistantId === "claude") {
        const mcp = await buildMcpInjection(id);
        if (mcp) {
          commandArgs.push(...mcp.args);
          registerTabCleanup(id, mcp.cleanup);
        } else if (import.meta.env.DEV) {
          console.warn(
            `Shep MCP server not ready; launching ${assistant.name} without MCP injection.`,
          );
        }
      }

      try {
        const ptyId = await spawnSession(
          assistant.command,
          commandArgs,
          {},
          cols,
          rows,
          null,
          activeRepoPath,
        );
        if (!ptyId) return;

        addTab({
          id,
          kind: "assistant",
          label: opts?.restoreLabel ?? assistant.name,
          ptyId,
          repoPath: activeRepoPath,
          commandName: null,
          assistantId,
          sessionMode: mode,
          sessionId: tabSessionId,
        });

        // For forked sessions Claude generates the new session ID lazily, only
        // once it produces its first response. Kick off a background poller so
        // the tab can recover the new ID and become re-branchable. Fire-and-
        // forget — it self-terminates on success, tab close, or 5-min timeout.
        if (opts?.forkFromSessionId) {
          const spawnTimeMs = Date.now();
          const repoPathForPoll = activeRepoPath;
          const tabIdForPoll = id;
          void pollForForkedSessionId(tabIdForPoll, repoPathForPoll, spawnTimeMs);
        }

        return ptyId;
      } catch (e) {
        // Spawn failed — release any MCP token/tempfile we registered above.
        await runTabCleanup(id);
        if (import.meta.env.DEV) {
          console.error(`Failed to launch ${assistant.name}:`, e);
        }
        pushNotice({
          tone: "error",
          title: `Couldn’t launch ${assistant.name}`,
          message: getErrorMessage(e),
        });
        return null;
      }
    },
    [activeRepoPath, spawnSession, addTab, pushNotice],
  );

  const branchTab = useCallback(
    async (sourceTabId: string, initialPrompt?: string) => {
      const state = useTerminalStore.getState();
      const path = state.activeProjectPath;
      if (!path) return;
      const tabs = state.projectState[path]?.tabs ?? [];
      const source = tabs.find((t) => t.id === sourceTabId);

      if (!source || source.kind !== "assistant" || !source.assistantId) {
        pushNotice({
          tone: "error",
          title: "Can't branch",
          message: "Source is not an assistant tab.",
        });
        return;
      }
      if (source.assistantId !== "claude") {
        pushNotice({
          tone: "error",
          title: "Can't branch",
          message: "Branching is only supported for Claude tabs.",
        });
        return;
      }
      if (!source.sessionId) {
        pushNotice({
          tone: "info",
          title: "Wait for first response",
          message: "The session needs at least one response before it can be branched.",
        });
        return;
      }

      const newPtyId = await launchAssistant(
        source.assistantId,
        80,
        24,
        source.sessionMode ?? "standard",
        undefined,
        undefined,
        {
          restoreLabel: `${source.label} ↳`,
          forkFromSessionId: source.sessionId,
        },
      );

      if (newPtyId && initialPrompt) {
        // Wait for Claude to finish initializing before sending the prompt.
        // 1500ms is a reasonable heuristic; if it proves flaky we'll add a
        // proper readiness signal.
        setTimeout(() => {
          void writePty(newPtyId, `${initialPrompt}\r`);
        }, 1500);
      }

      return newPtyId;
    },
    [launchAssistant, pushNotice],
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      const state = useTerminalStore.getState();
      const path = state.activeProjectPath;
      if (!path) return;
      const tabs = state.projectState[path]?.tabs ?? [];
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || (tab.kind !== "terminal" && tab.kind !== "assistant")) return;

      cleanupActivityState(tab.ptyId);
      stoppingPtys.add(tab.ptyId);
      await killPty(tab.ptyId).catch(() => {
        stoppingPtys.delete(tab.ptyId);
      });
      unregisterTerminal(tab.ptyId);
      removeActivity(tab.ptyId);

      if (tab.commandName) {
        setCommandStatus(tab.commandName, "stopped");
        setCommandPtyId(tab.commandName, null);
      }

      await runTabCleanup(tabId);
      removeTab(tabId);
    },
    [setCommandStatus, setCommandPtyId, removeTab, removeActivity],
  );

  const killProjectPtys = useCallback(async (repoPath: string) => {
    const state = useTerminalStore.getState();
    const tabs = state.getAllProjectTabs(repoPath);

    for (const tab of tabs) {
      if (tab.kind !== "terminal" && tab.kind !== "assistant") continue;
      cleanupActivityState(tab.ptyId);
      stoppingPtys.add(tab.ptyId);
      await killPty(tab.ptyId).catch(() => {
        stoppingPtys.delete(tab.ptyId);
      });
      unregisterTerminal(tab.ptyId);
      removeActivity(tab.ptyId);
      await runTabCleanup(tab.id);
    }
  }, [removeActivity]);

  return {
    startCommand,
    stopCommand,
    restartCommand,
    spawnBlankShell,
    launchAssistant,
    branchTab,
    closeTab,
    killProjectPtys,
  };
}
