import { useCallback } from "react";
import { spawnPty, killPty, gitRemoveWorktree, gitCurrentBranch } from "../lib/tauri";
import type { PtyOutput, CommandConfig, SessionMode } from "../lib/types";
import { useCommandStore } from "../stores/useCommandStore";
import { useTerminalStore, nextTabId } from "../stores/useTerminalStore";
import { useRepoStore } from "../stores/useRepoStore";
import { CODING_ASSISTANTS } from "../components/sidebar/constants";
import type { Terminal } from "@xterm/xterm";

// Map ptyId -> xterm instance for writing output
const terminalInstances = new Map<number, Terminal>();

// Buffer for PTY output that arrives before terminal is registered
const pendingOutput = new Map<number, string[]>();

// Debounce timers for activity detection — clears "active" after 3s of silence
const activityTimers = new Map<number, ReturnType<typeof setTimeout>>();
const ACTIVITY_TIMEOUT = 3000;

function cleanupActivityState(ptyId: number) {
  const timer = activityTimers.get(ptyId);
  if (timer) { clearTimeout(timer); activityTimers.delete(ptyId); }
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
    for (const data of buffered) {
      term.write(data);
    }
    pendingOutput.delete(ptyId);
  }
}

export function unregisterTerminal(ptyId: number) {
  terminalInstances.delete(ptyId);
  pendingOutput.delete(ptyId);
}

function writeToPty(ptyId: number, data: string) {
  const term = terminalInstances.get(ptyId);
  if (term) {
    term.write(data);
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
  const {
    setCommandStatus,
    setCommandPtyId,
    setCommandStatusForProject,
    setCommandPtyIdForProject,
  } = useCommandStore();
  const { addTab, removeTab, findTabByCommand, setActiveTab, initActivity, setTabActive, setTabExited, updateLastActivity, removeActivity } =
    useTerminalStore();

  const handlePtyMessage = useCallback(
    (
      ptyId: number,
      commandName: string | null,
      repoPath: string,
      msg: PtyOutput,
    ) => {
      if (msg.event === "data") {
        writeToPty(ptyId, msg.data);
        updateLastActivity(ptyId);
        setTabActive(ptyId, true);

        // Reset the idle timer — after 3s of no output, mark as inactive
        const existing = activityTimers.get(ptyId);
        if (existing) clearTimeout(existing);
        activityTimers.set(ptyId, setTimeout(() => {
          setTabActive(ptyId, false);
          activityTimers.delete(ptyId);
        }, ACTIVITY_TIMEOUT));
      } else if (msg.event === "exit") {
        cleanupActivityState(ptyId);
        setTabExited(ptyId, msg.data.code);
        if (commandName) {
          setCommandStatusForProject(repoPath, commandName, "crashed");
          setCommandPtyIdForProject(repoPath, commandName, null);
        }
      }
    },
    [setCommandStatusForProject, setCommandPtyIdForProject, updateLastActivity, setTabActive, setTabExited],
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

      const ptyId = await spawnPty(command, repoPath, env, cols, rows, (msg) => {
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

      try {
        const ptyId = await spawnSession(
          command.command,
          command.env,
          cols,
          rows,
          commandName,
          resolveCommandCwd(activeRepoPath, command.cwd ?? null),
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
            worktreePath: null,
            branch: null,
          });
        }

        return ptyId;
      } catch (e) {
        console.error(`Failed to start command "${commandName}":`, e);
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
    ],
  );

  const stopCommand = useCallback(
    async (commandName: string) => {
      const path = useCommandStore.getState().activeProjectPath;
      if (!path) return;
      const state = useTerminalStore.getState();
      const commands = useCommandStore.getState().projectCommands[path] ?? [];
      const command = commands.find((c) => c.name === commandName);
      const tab = state.projectState[path]?.tabs.find((t) => t.commandName === commandName);
      if (command?.ptyId) {
        cleanupActivityState(command.ptyId);
        await killPty(command.ptyId).catch(() => {});
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
        const ptyId = await spawnSession(
          "/bin/zsh -l",
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
          label: "Shell",
          ptyId,
          repoPath: activeRepoPath,
          commandName: null,
          assistantId: null,
          sessionMode: null,
          worktreePath: null,
          branch: null,
        });

        return ptyId;
      } catch (e) {
        console.error("Failed to spawn shell:", e);
      }
    },
    [activeRepoPath, spawnSession, addTab],
  );

  const launchAssistant = useCallback(
    async (
      assistantId: string,
      cols: number,
      rows: number,
      mode: SessionMode = "standard",
      worktreePath: string | null = null,
    ) => {
      if (!activeRepoPath) return;
      const assistant = CODING_ASSISTANTS.find((a) => a.id === assistantId);
      if (!assistant) return;

      let command = assistant.command;
      if (mode === "yolo" && assistant.yoloFlag) {
        command = `${command} ${assistant.yoloFlag}`;
      }

      const cwd = worktreePath ?? activeRepoPath;

      try {
        // Fetch current branch for display
        const branch = await gitCurrentBranch(cwd).catch(() => null);

        const ptyId = await spawnSession(
          command,
          {},
          cols,
          rows,
          null,
          cwd,
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
          worktreePath,
          branch,
        });

        return ptyId;
      } catch (e) {
        console.error(`Failed to launch ${assistant.name}:`, e);
      }
    },
    [activeRepoPath, spawnSession, addTab],
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
      await killPty(tab.ptyId).catch(() => {});
      unregisterTerminal(tab.ptyId);
      removeActivity(tab.ptyId);

      if (tab.commandName) {
        setCommandStatus(tab.commandName, "stopped");
        setCommandPtyId(tab.commandName, null);
      }

      // Clean up worktree for YOLO sessions
      if (tab.worktreePath) {
        await gitRemoveWorktree(tab.repoPath, tab.worktreePath).catch((e) => {
          console.warn("Failed to remove worktree:", e);
        });
      }

      removeTab(tabId);
    },
    [setCommandStatus, setCommandPtyId, removeTab, removeActivity],
  );

  const killProjectPtys = useCallback(async (repoPath: string) => {
    const state = useTerminalStore.getState();
    const tabs = state.projectState[repoPath]?.tabs ?? [];
    for (const tab of tabs) {
      cleanupActivityState(tab.ptyId);
      await killPty(tab.ptyId).catch(() => {});
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
