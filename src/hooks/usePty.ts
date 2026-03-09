import { useCallback } from "react";
import { spawnPty, killPty } from "../lib/tauri";
import type { PtyOutput, CommandConfig } from "../lib/types";
import { useCommandStore } from "../stores/useCommandStore";
import { useTerminalStore, nextTabId } from "../stores/useTerminalStore";
import { useRepoStore } from "../stores/useRepoStore";
import { CODING_ASSISTANTS } from "../components/sidebar/constants";
import type { Terminal } from "@xterm/xterm";

// Map ptyId -> xterm instance for writing output
const terminalInstances = new Map<number, Terminal>();

// Buffer for PTY output that arrives before terminal is registered
const pendingOutput = new Map<number, string[]>();

export function registerTerminal(ptyId: number, term: Terminal) {
  terminalInstances.set(ptyId, term);

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

export function usePty() {
  const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
  const { setCommandStatus, setCommandPtyId } = useCommandStore();
  const { addTab, removeTab, findTabByCommand, setActiveTab } =
    useTerminalStore();

  const handlePtyMessage = useCallback(
    (ptyId: number, commandName: string | null, msg: PtyOutput) => {
      if (msg.event === "data") {
        writeToPty(ptyId, msg.data);
      } else if (msg.event === "exit") {
        if (commandName) {
          setCommandStatus(commandName, "crashed");
          setCommandPtyId(commandName, null);
        }
      }
    },
    [setCommandStatus, setCommandPtyId],
  );

  const spawnSession = useCallback(
    async (
      command: string,
      env: Record<string, string>,
      cols: number,
      rows: number,
      commandName: string | null,
    ) => {
      if (!activeRepoPath) return;

      let resolvedPtyId: number | null = null;
      const bufferedMessages: PtyOutput[] = [];

      const ptyId = await spawnPty(command, activeRepoPath, env, cols, rows, (msg) => {
        if (resolvedPtyId === null) {
          bufferedMessages.push(msg);
          return;
        }

        handlePtyMessage(resolvedPtyId, commandName, msg);
      });

      resolvedPtyId = ptyId;

      for (const msg of bufferedMessages) {
        handlePtyMessage(ptyId, commandName, msg);
      }

      return ptyId;
    },
    [activeRepoPath, handlePtyMessage],
  );

  const startCommand = useCallback(
    async (command: CommandConfig, cols: number, rows: number) => {
      const commandName = command.name;

      try {
        const ptyId = await spawnSession(
          command.command,
          command.env,
          cols,
          rows,
          commandName,
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
            commandName,
            assistantId: null,
          });
        }

        return ptyId;
      } catch (e) {
        console.error(`Failed to start command "${commandName}":`, e);
      }
    },
    [
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
      const commands = useCommandStore.getState().commands;
      const command = commands.find((c) => c.name === commandName);
      if (command?.ptyId) {
        await killPty(command.ptyId).catch(() => {});
        unregisterTerminal(command.ptyId);
      }
      setCommandStatus(commandName, "stopped");
      setCommandPtyId(commandName, null);
    },
    [setCommandStatus, setCommandPtyId],
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
      try {
        const ptyId = await spawnSession(
          "/bin/zsh -l",
          {},
          cols,
          rows,
          null,
        );
        if (!ptyId) return;

        const id = nextTabId();
        addTab({
          id,
          label: "Shell",
          ptyId,
          commandName: null,
          assistantId: null,
        });

        return ptyId;
      } catch (e) {
        console.error("Failed to spawn shell:", e);
      }
    },
    [spawnSession, addTab],
  );

  const launchAssistant = useCallback(
    async (assistantId: string, cols: number, rows: number) => {
      const assistant = CODING_ASSISTANTS.find((a) => a.id === assistantId);
      if (!assistant) return;

      try {
        const ptyId = await spawnSession(
          assistant.command,
          {},
          cols,
          rows,
          null,
        );
        if (!ptyId) return;

        const id = nextTabId();
        addTab({
          id,
          label: assistant.name,
          ptyId,
          commandName: null,
          assistantId,
        });

        return ptyId;
      } catch (e) {
        console.error(`Failed to launch ${assistant.name}:`, e);
      }
    },
    [spawnSession, addTab],
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      const tabs = useTerminalStore.getState().tabs;
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      await killPty(tab.ptyId).catch(() => {});
      unregisterTerminal(tab.ptyId);

      if (tab.commandName) {
        setCommandStatus(tab.commandName, "stopped");
        setCommandPtyId(tab.commandName, null);
      }

      removeTab(tabId);
    },
    [setCommandStatus, setCommandPtyId, removeTab],
  );

  const killAllPtys = useCallback(async () => {
    const tabs = useTerminalStore.getState().tabs;
    for (const tab of tabs) {
      await killPty(tab.ptyId).catch(() => {});
      unregisterTerminal(tab.ptyId);
    }
  }, []);

  return {
    startCommand,
    stopCommand,
    restartCommand,
    spawnBlankShell,
    launchAssistant,
    closeTab,
    killAllPtys,
  };
}
