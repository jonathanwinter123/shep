import { useCallback } from "react";
import { spawnPty, killPty, getDefaultShell, writePty } from "../lib/tauri";
import { useThemeStore } from "../stores/useThemeStore";
import type { PtyOutput, CommandConfig, SessionMode } from "../lib/types";
import { useCommandStore } from "../stores/useCommandStore";
import { useTerminalStore, nextTabId } from "../stores/useTerminalStore";
import { useRepoStore } from "../stores/useRepoStore";
import { useNoticeStore } from "../stores/useNoticeStore";
import { CODING_ASSISTANTS } from "../components/sidebar/constants";
import type { Terminal } from "@xterm/xterm";
import { getErrorMessage } from "../lib/errors";

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

/** Relative luminance of a hex color (0 = black, 1 = white) */
function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Respond to OSC 11 background color queries immediately — before xterm
// processes the data — so CLI tools (Claude Code, Gemini) that query during
// startup get a response within their detection timeout.
const OSC_11_QUERY = "\x1b]11;?\x1b\\";
const OSC_11_QUERY_BEL = "\x1b]11;?\x07";

function handleOsc11Query(ptyId: number, data: string): void {
  if (data.includes(OSC_11_QUERY) || data.includes(OSC_11_QUERY_BEL)) {
    const hex = useThemeStore.getState().theme.appBg;
    const r = hex.slice(1, 3);
    const g = hex.slice(3, 5);
    const b = hex.slice(5, 7);
    const response = `\x1b]11;rgb:${r}${r}/${g}${g}/${b}${b}\x1b\\`;
    writePty(ptyId, response).catch(() => {});
  }
}

function writeToPty(ptyId: number, data: string) {
  handleOsc11Query(ptyId, data);
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

      const ptyId = await spawnPty(command, repoPath, fullEnv, cols, rows, (msg) => {
        if (resolvedPtyId === null) {
          bufferedMessages.push(msg);
          return;
        }

        handlePtyMessage(resolvedPtyId, commandName, repoPath, msg);
      });

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
    async (command: CommandConfig, cols: number, rows: number) => {
      if (!activeRepoPath) return;
      const commandName = command.name;

      const basePath = activeRepoPath;

      try {
        const ptyId = await spawnSession(
          command.command,
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
          const id = nextTabId();
          addTab({
            id,
            label: commandName,
            ptyId,
            repoPath: activeRepoPath,
            commandName,
            assistantId: null,
            sessionMode: null,
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
      const tab = state.getAllProjectTabs(path).find((t) => t.commandName === commandName);
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
    async (cols: number, rows: number) => {
      if (!activeRepoPath) return;

      try {
        const shell = await getDefaultShell();
        const ptyId = await spawnSession(
          `${shell} -l`,
          {},
          cols,
          rows,
          null,
          activeRepoPath,
        );
        if (!ptyId) return;

        const id = nextTabId();
        addTab({
          id,
          label: "Terminal",
          ptyId,
          repoPath: activeRepoPath,
          commandName: null,
          assistantId: null,
          sessionMode: null,
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
    ) => {
      if (!activeRepoPath) return;
      const assistant = CODING_ASSISTANTS.find((a) => a.id === assistantId);
      if (!assistant) return;

      let command = assistant.command;
      if (mode === "yolo" && assistant.yoloFlag) {
        command = `${command} ${assistant.yoloFlag}`;
      }

      try {
        const ptyId = await spawnSession(
          command,
          {},
          cols,
          rows,
          null,
          activeRepoPath,
        );
        if (!ptyId) return;

        const id = nextTabId();
        addTab({
          id,
          label: assistant.name,
          ptyId,
          repoPath: activeRepoPath,
          commandName: null,
          assistantId,
          sessionMode: mode,
        });

        return ptyId;
      } catch (e) {
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

  const closeTab = useCallback(
    async (tabId: string) => {
      const state = useTerminalStore.getState();
      const path = state.activeProjectPath;
      if (!path) return;
      const tabs = state.projectState[path]?.tabs ?? [];
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

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

      removeTab(tabId);
    },
    [setCommandStatus, setCommandPtyId, removeTab, removeActivity],
  );

  const killProjectPtys = useCallback(async (repoPath: string) => {
    const state = useTerminalStore.getState();
    const tabs = state.getAllProjectTabs(repoPath);

    for (const tab of tabs) {
      cleanupActivityState(tab.ptyId);
      stoppingPtys.add(tab.ptyId);
      await killPty(tab.ptyId).catch(() => {
        stoppingPtys.delete(tab.ptyId);
      });
      unregisterTerminal(tab.ptyId);
      removeActivity(tab.ptyId);
    }
  }, [removeActivity]);

  return {
    startCommand,
    stopCommand,
    restartCommand,
    spawnBlankShell,
    launchAssistant,
    closeTab,
    killProjectPtys,
  };
}
