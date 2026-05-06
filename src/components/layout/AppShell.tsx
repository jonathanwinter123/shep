import { Suspense, lazy, useEffect, useCallback, useRef, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Sidebar from "../sidebar/Sidebar";
import TabBar from "./TabBar";
import TerminalView from "../terminal/TerminalView";
import TerminalErrorBoundary from "../terminal/TerminalErrorBoundary";
import NoticeCenter from "../shared/NoticeCenter";
import SessionHistoryPanel from "../session/SessionHistoryPanel";
import FilePreviewPanel from "../files/FilePreviewPanel";
import { PanelLeft, PanelLeftOpen } from "lucide-react";
import { useRepoStore } from "../../stores/useRepoStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";
import { useShallow } from "zustand/shallow";
import { usePty } from "../../hooks/usePty";
import { useThemeApplicator } from "../../hooks/useThemeApplicator";
import { useGitWatcher } from "../../hooks/useGitWatcher";
import { computeTerminalSize } from "../../lib/terminalMeasure";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { getUsername, getComputerName, openInEditor, saveWorkspace, shutdownAndQuit, refreshUsageData, loadTabState } from "../../lib/tauri";
import { useEditorStore } from "../../stores/useEditorStore";
import { useTerminalSettingsStore } from "../../stores/useTerminalSettingsStore";
import { useUsageStore } from "../../stores/useUsageStore";
import { useUsageSettingsStore } from "../../stores/useUsageSettingsStore";
import { useUpdateStore } from "../../stores/useUpdateStore";
import { initNotifications } from "../../lib/notifications";
import { getErrorMessage } from "../../lib/errors";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { registerActions } from "../../lib/registerActions";
import { eventToCombo } from "../../lib/keyCombo";
import { getAction } from "../../lib/actionRegistry";
import { useShortcutStore } from "../../stores/useShortcutStore";

import { seedTabCounter } from "../../stores/useTerminalStore";
import type { CommandConfig, CommandState, TerminalTabData, UnifiedTab, SessionMode, WorkspaceConfig, PersistedTab } from "../../lib/types";
const LAST_REPO_STORAGE_KEY = "shep:last-repo-path";

// Stable empty arrays to avoid infinite re-render loops with zustand v5's
// useSyncExternalStore — selectors must return the same reference for the same state.
const EMPTY_TABS: UnifiedTab[] = [];
const EMPTY_COMMANDS: CommandState[] = [];
const SettingsPanel = lazy(() => import("../settings/SettingsPanel"));
const GitPanel = lazy(() => import("../git/GitPanel"));
const CommandsPanel = lazy(() => import("../commands/CommandsPanel"));
const SessionLauncher = lazy(() => import("../session/SessionLauncher"));
const UsagePanel = lazy(() => import("../usage/UsagePanel"));
const PortsPanel = lazy(() => import("../ports/PortsPanel"));

function toCommandConfig(command: CommandState): CommandConfig {
  return {
    name: command.name,
    command: command.command,
    autostart: command.autostart,
    env: command.env,
    cwd: command.cwd,
  };
}

function fallbackWorkspaceName(repoPath: string) {
  return repoPath.split("/").filter(Boolean).pop() ?? "Project";
}

function PanelLoader() {
  return <div className="terminal-empty">Loading panel…</div>;
}

export default function AppShell() {
  useThemeApplicator();

  const { repos, groups, activeRepoPath, fetchRepos, fetchGroups, openRepo, addRepo, removeRepo, renameGroup, deleteGroup, moveRepoToGroup } =
    useRepoStore();
  const activeConfig = useRepoStore((s) => s.activeConfig);
  const setActiveConfig = useRepoStore((s) => s.setActiveConfig);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const { startCommand, stopCommand, spawnBlankShell, launchAssistant, closeTab, killProjectPtys, branchTab } =
    usePty();

  const restoreAttemptedRef = useRef(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  const getTerminalDimensions = useCallback(() => {
    const el = terminalContainerRef.current;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
      return { cols: 80, rows: 24 };
    }
    return computeTerminalSize(el.clientWidth, el.clientHeight);
  }, []);

  // Derive active project's tabs and commands from stores
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const activeProjectTerminals = useTerminalStore(
    (s) => (s.activeProjectPath ? s.projectState[s.activeProjectPath] : null),
  );
  const tabs = activeProjectTerminals?.tabs ?? EMPTY_TABS;
  const activeTabId = activeProjectTerminals?.activeTabId ?? null;
  // Derive allTabs via useMemo instead of a selector that returns a new array
  // every call — zustand v5 + useSyncExternalStore would infinite-loop otherwise.
  const projectState = useTerminalStore((s) => s.projectState);

  // Git watching: main repo paths only — worktree paths are discovered automatically
  const gitRepoPaths = useMemo(
    () => repos.map((r) => r.path),
    [repos],
  );
  useGitWatcher(gitRepoPaths);
  // Collect only PTY-backed tabs for TerminalView rendering (panel tabs have no terminal)
  const allTerminalTabs = useMemo(() => {
    const all: TerminalTabData[] = [];
    for (const ps of Object.values(projectState)) {
      for (const tab of ps.tabs) {
        if (tab.kind === "terminal" || tab.kind === "assistant") {
          all.push(tab);
        }
      }
    }

    // Keep terminal DOM order stable even when the visible tab order changes.
    // xterm renderers can fail to repaint cleanly when their mounted nodes are
    // shuffled around in the document during tab drag/reorder operations.
    return all.sort((a, b) => a.ptyId - b.ptyId || a.id.localeCompare(b.id));
  }, [projectState]);

  const commands = useCommandStore(
    (s) => (s.activeProjectPath ? s.projectCommands[s.activeProjectPath] ?? EMPTY_COMMANDS : EMPTY_COMMANDS),
  );

  const { setActiveTab } = useTerminalStore.getState();

  const persistWorkspaceCommands = useCallback(
    async (nextCommands: CommandConfig[]) => {
      if (!activeRepoPath) return null;

      const nextConfig: WorkspaceConfig = {
        name: activeConfig?.name ?? fallbackWorkspaceName(activeRepoPath),
        assistants: activeConfig?.assistants ?? [],
        commands: nextCommands,
      };

      try {
        await saveWorkspace(activeRepoPath, nextConfig);
        setActiveConfig(nextConfig);
        return nextConfig;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Failed to save workspace commands:", error);
        }
        pushNotice({
          tone: "error",
          title: "Couldn’t save workspace",
          message: getErrorMessage(error),
        });
        return null;
      }
    },
    [activeConfig, activeRepoPath, pushNotice, setActiveConfig],
  );

  const {
    settingsActive, usagePanelActive, portsPanelActive, sessionHistoryActive, filePreviewActive, sidebarVisible,
  } = useUIStore(useShallow((s) => ({
    settingsActive: s.settingsActive,
    usagePanelActive: s.usagePanelActive,
    portsPanelActive: s.portsPanelActive,
    sessionHistoryActive: s.sessionHistoryActive,
    filePreviewActive: s.filePreviewActive,
    sidebarVisible: s.sidebarVisible,
  })));

  // Derive which kind of local tab is active (for panel content rendering)
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const { loadSettings: loadEditorSettings } = useEditorStore.getState();
  const { loadSettings: loadTerminalSettings } = useTerminalSettingsStore.getState();
  const { fetchSnapshots: fetchUsageSnapshots } = useUsageStore.getState();
  const { loadSettings: loadUsageSettings } = useUsageSettingsStore.getState();

  useEffect(() => {
    fetchRepos();
    fetchGroups();
    void loadEditorSettings();
    void loadTerminalSettings();
    void loadUsageSettings();
    void fetchUsageSnapshots();
    void useShortcutStore.getState().loadSettings();
    const usageRefreshTimer = window.setTimeout(() => {
      void fetchUsageSnapshots();
    }, 3000);
    void refreshUsageData();
    void initNotifications();
    getUsername().then((name) => useUIStore.getState().setUsername(name));
    getComputerName().then((name) => useUIStore.getState().setComputerName(name));

    // Check for updates after startup settles
    const updateTimer = window.setTimeout(async () => {
      await useUpdateStore.getState().checkForUpdate();
      const { status, availableVersion } = useUpdateStore.getState();
      if (status === "available" && availableVersion) {
        pushNotice(
          { tone: "info", title: "Update available", message: `Version ${availableVersion} is ready to download` },
          { durationMs: 8000 },
        );
      }
    }, 3000);
    return () => {
      window.clearTimeout(updateTimer);
      window.clearTimeout(usageRefreshTimer);
    };
  }, [fetchRepos, fetchGroups, loadEditorSettings, loadTerminalSettings, loadUsageSettings, fetchUsageSnapshots, pushNotice]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshUsageData();
      void fetchUsageSnapshots();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [fetchUsageSnapshots]);

  // Auto-refresh when background ingest completes
  useEffect(() => {
    const unlisten = listen("usage-ingest-complete", () => {
      void fetchUsageSnapshots();
    });
    return () => { unlisten.then((f) => f()); };
  }, [fetchUsageSnapshots]);

  // Spawn a branched tab when the MCP server asks via the branch_tab tool.
  // Payload uses snake_case keys to match what `serde_json::json!({...})`
  // emits from src-tauri/src/mcp/server.rs (Tauri does NOT auto-camelCase
  // emitted event payloads, only Serialize-derived command return types).
  useEffect(() => {
    interface BranchTabRequest {
      source_tab_id: string;
      initial_prompt: string | null;
    }
    const unlisten = listen<BranchTabRequest>("branch-tab-request", (event) => {
      const { source_tab_id, initial_prompt } = event.payload;
      void branchTab(source_tab_id, initial_prompt ?? undefined);
    });
    return () => { unlisten.then((f) => f()); };
  }, [branchTab]);

  const handleSelectRepo = useCallback(
    async (repoPath: string) => {
      if (repoPath === activeRepoPath) return;

      try {
        const isFirstVisit = !useCommandStore.getState().hasProject(repoPath);

        const config = await openRepo(repoPath);
        restoreAttemptedRef.current = true;
        window.localStorage.setItem(LAST_REPO_STORAGE_KEY, repoPath);
        useTerminalStore.getState().switchProject(repoPath);
        useCommandStore.getState().switchProject(repoPath);
        if (isFirstVisit) {
          useCommandStore.getState().loadCommands(repoPath, config.commands);

          const persisted = await loadTabState(repoPath).catch((err) => {
            if (import.meta.env.DEV) console.error("loadTabState failed:", err);
            return [] as PersistedTab[];
          });

          const restoredCommandNames = new Set<string>(
            persisted
              .filter((p) => p.tabType === "command" && p.commandName)
              .map((p) => p.commandName as string),
          );

          if (persisted.length > 0) {
            seedTabCounter(persisted.map((p) => p.id));

            const { cols, rows } = getTerminalDimensions();

            for (const p of persisted) {
              try {
                if (p.tabType === "shell") {
                  await spawnBlankShell(cols, rows, { restoreId: p.id, restoreLabel: p.label });
                } else if (p.tabType === "command" && p.commandName) {
                  const cmd = config.commands.find((c) => c.name === p.commandName);
                  if (cmd) {
                    await startCommand(cmd, cols, rows, { restoreId: p.id, restoreLabel: p.label });
                  }
                } else if (p.tabType === "assistant" && p.assistantId) {
                  await launchAssistant(
                    p.assistantId,
                    cols,
                    rows,
                    p.sessionMode ?? "standard",
                    undefined, // model
                    p.sessionId ?? undefined,
                    { restoreId: p.id, restoreLabel: p.label },
                  );
                }
              } catch (err) {
                pushNotice({
                  tone: "error",
                  title: "Couldn't restore tab",
                  message: `${p.label}: ${getErrorMessage(err)}`,
                });
              }
            }

            const activePersisted = persisted.find((p) => p.isActive);
            if (activePersisted) {
              useTerminalStore.getState().setActiveTab(activePersisted.id);
            }
          }

          for (const cmd of config.commands) {
            if (cmd.autostart && !restoredCommandNames.has(cmd.name)) {
              const { cols, rows } = getTerminalDimensions();
              await startCommand(cmd, cols, rows);
            }
          }
        }
      } catch (error) {
        pushNotice({
          tone: "error",
          title: "Couldn’t open project",
          message: getErrorMessage(error),
        });
      }
    },
    [activeRepoPath, openRepo, startCommand, spawnBlankShell, launchAssistant, getTerminalDimensions, pushNotice],
  );

  const handleAddProject = useCallback(
    async (repoPath: string) => {
      try {
        const config = await addRepo(repoPath);
        // addRepo sets activeRepoPath in the repo store, get the canonical path
        const canonicalPath = useRepoStore.getState().activeRepoPath;
        if (!canonicalPath) return;
        restoreAttemptedRef.current = true;
        window.localStorage.setItem(LAST_REPO_STORAGE_KEY, canonicalPath);
        useTerminalStore.getState().switchProject(canonicalPath);
        useCommandStore.getState().switchProject(canonicalPath);
        useCommandStore.getState().loadCommands(canonicalPath, config.commands);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: "Couldn’t add project",
          message: getErrorMessage(error),
        });
      }
    },
    [addRepo, pushNotice],
  );

  const handleRemoveProject = useCallback(
    async (repoPath: string) => {
      const repoName = repoPath.split("/").filter(Boolean).pop() ?? "this project";
      const confirmed = await ask(
        `Remove "${repoName}" from Shep? The files on disk will not be deleted.`,
        { title: "Remove project", kind: "warning", okLabel: "Remove", cancelLabel: "Cancel" },
      );
      if (!confirmed) return;
      try {
        await killProjectPtys(repoPath);
        await removeRepo(repoPath);
        useTerminalStore.getState().removeProject(repoPath);
        useCommandStore.getState().removeProject(repoPath);
        useGitStore.getState().removeProject(repoPath);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: "Couldn’t remove project",
          message: getErrorMessage(error),
        });
      }
    },
    [killProjectPtys, pushNotice, removeRepo],
  );

  const handleRenameGroup = useCallback(
    async (groupId: string, newName: string) => {
      try {
        await renameGroup(groupId, newName);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: "Couldn’t rename group",
          message: getErrorMessage(error),
        });
      }
    },
    [renameGroup, pushNotice],
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      const groupName = group?.name ?? "this group";
      const confirmed = await ask(
        `Remove group "${groupName}"? Projects in this group will become ungrouped.`,
        { title: "Remove group", kind: "warning", okLabel: "Remove", cancelLabel: "Cancel" },
      );
      if (!confirmed) return;
      try {
        await deleteGroup(groupId);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: "Couldn’t delete group",
          message: getErrorMessage(error),
        });
      }
    },
    [groups, deleteGroup, pushNotice],
  );

  const handleMoveToGroup = useCallback(
    async (repoPath: string, groupId: string | null) => {
      try {
        await moveRepoToGroup(repoPath, groupId);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: "Couldn’t move project",
          message: getErrorMessage(error),
        });
      }
    },
    [moveRepoToGroup, pushNotice],
  );

  const handleStartCommand = useCallback(
    (name: string) => {
      const path = useCommandStore.getState().activeProjectPath;
      if (!path) return;
      const cmds = useCommandStore.getState().projectCommands[path] ?? [];
      const cmd = cmds.find((c) => c.name === name);
      if (cmd) {
        const { cols, rows } = getTerminalDimensions();
        startCommand(
          {
            name: cmd.name,
            command: cmd.command,
            autostart: cmd.autostart,
            env: cmd.env,
            cwd: cmd.cwd,
          },
          cols,
          rows,
        );
      }
    },
    [startCommand, getTerminalDimensions],
  );

  const handleSelectSidebarTab = useCallback((tabId: string) => {
    useUIStore.getState().deactivateAllOverlays();
    setActiveTab(tabId);
    const store = useTerminalStore.getState();
    const allTabs = activeRepoPath ? store.getAllProjectTabs(activeRepoPath) : [];
    const tab = allTabs.find((t) => t.id === tabId);
    if (tab && (tab.kind === "terminal" || tab.kind === "assistant")) {
      store.clearTabBell(tab.ptyId);
    }
  }, [setActiveTab, activeRepoPath]);

  const handleCloseTab = useCallback((tabId: string) => {
    const store = useTerminalStore.getState();
    const path = store.activeProjectPath;
    if (!path) return;
    const tab = store.projectState[path]?.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.kind === "terminal" || tab.kind === "assistant") {
      closeTab(tabId);
    } else {
      store.removeTab(tabId);
    }
  }, [closeTab]);

  const handleNewAssistant = useCallback(() => {
    useTerminalStore.getState().addPanelTab("launcher");
  }, []);

  const handleStartSession = useCallback(
    async (assistantId: string, mode: SessionMode, model?: string) => {
      const { cols, rows } = getTerminalDimensions();
      const ptyId = await launchAssistant(assistantId, cols, rows, mode, model);
      if (ptyId) {
        useTerminalStore.getState().removePanelTab("launcher");
        useUIStore.getState().deactivateAllOverlays();
        return true;
      }
      return false;
    },
    [launchAssistant, getTerminalDimensions],
  );

  const handleResumeSession = useCallback(
    async (sessionId: string) => {
      const { cols, rows } = getTerminalDimensions();
      const ptyId = await launchAssistant("claude", cols, rows, "standard", undefined, sessionId);
      if (ptyId) {
        useTerminalStore.getState().removePanelTab("launcher");
        useUIStore.getState().deactivateAllOverlays();
        return true;
      }
      return false;
    },
    [launchAssistant, getTerminalDimensions],
  );

  const handleNewShell = useCallback(() => {
    useUIStore.getState().deactivateAllOverlays();
    const { cols, rows } = getTerminalDimensions();
    spawnBlankShell(cols, rows);
  }, [spawnBlankShell, getTerminalDimensions]);

  const handleCreateCommand = useCallback(
    async (command: CommandConfig) => {
      if (!activeRepoPath) return false;
      const nextCommands = [...commands.map(toCommandConfig), command];
      const saved = await persistWorkspaceCommands(nextCommands);
      if (!saved) return false;
      useCommandStore.getState().addCommandForProject(activeRepoPath, command);
      return true;
    },
    [activeRepoPath, commands, persistWorkspaceCommands],
  );

  const handleUpdateCommand = useCallback(
    async (previousName: string, command: CommandConfig) => {
      if (!activeRepoPath) return false;
      const nextCommands = commands.map((existing) =>
        existing.name === previousName ? command : toCommandConfig(existing),
      );
      const saved = await persistWorkspaceCommands(nextCommands);
      if (!saved) return false;
      await stopCommand(previousName);
      useCommandStore.getState().updateCommandForProject(
        activeRepoPath,
        previousName,
        command,
      );
      return true;
    },
    [activeRepoPath, commands, persistWorkspaceCommands, stopCommand],
  );

  const handleDeleteCommand = useCallback(
    async (name: string) => {
      if (!activeRepoPath) return;
      const nextCommands = commands
        .filter((command) => command.name !== name)
        .map(toCommandConfig);
      const saved = await persistWorkspaceCommands(nextCommands);
      if (!saved) return;
      await stopCommand(name);
      useCommandStore.getState().removeCommandForProject(activeRepoPath, name);
    },
    [activeRepoPath, commands, persistWorkspaceCommands, stopCommand],
  );

  const handleStartAllCommands = useCallback(async () => {
    for (const command of commands) {
      if (command.status !== "running") {
        handleStartCommand(command.name);
      }
    }
  }, [commands, handleStartCommand]);

  const handleStopAllCommands = useCallback(async () => {
    for (const command of commands) {
      if (command.status === "running") {
        await stopCommand(command.name);
      }
    }
  }, [commands, stopCommand]);

  const handleOpenInEditor = useCallback(async (repoPath: string) => {
    const preferredEditor = useEditorStore.getState().settings.preferredEditor;
    if (!preferredEditor) {
      useUIStore.getState().toggleSettings();
      return;
    }

    try {
      await openInEditor(repoPath);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to open editor:", error);
      }
      pushNotice({
        tone: "error",
        title: "Couldn’t open editor",
        message: getErrorMessage(error),
      });
    }
  }, [pushNotice]);

  useEffect(() => {
    if (restoreAttemptedRef.current || activeRepoPath || repos.length === 0) return;

    restoreAttemptedRef.current = true;

    const storedRepoPath = window.localStorage.getItem(LAST_REPO_STORAGE_KEY);
    const initialRepo =
      repos.find((repo) => repo.path === storedRepoPath) ??
      repos[0];

    if (initialRepo) {
      void handleSelectRepo(initialRepo.path);
    }
  }, [repos, activeRepoPath, handleSelectRepo]);

  // Listen for backend "quit-requested" event (red close button or Cmd+Q with active PTYs)
  const quitDialogOpenRef = useRef(false);
  useEffect(() => {
    const unlisten = listen<number>("quit-requested", async (event) => {
      if (quitDialogOpenRef.current) return;
      quitDialogOpenRef.current = true;
      try {
        const count = event.payload;
        const confirmed = await ask(
          `Quit Shep and stop ${count} running session${count === 1 ? "" : "s"}?`,
          { title: "Quit Shep", kind: "warning", okLabel: "Quit", cancelLabel: "Cancel" },
        );
        if (confirmed) {
          await shutdownAndQuit();
        }
      } finally {
        quitDialogOpenRef.current = false;
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  // Handle native menu events (accelerators for Cmd+T, Cmd+Shift+T, Cmd+B, Cmd+E, Cmd+, etc.)
  useEffect(() => {
    const menuActionMap: Record<string, string> = {
      new_terminal: "shep.session.newTerminal",
      new_agent: "shep.session.newAssistant",
      toggle_sidebar: "shep.panel.toggleSidebar",
      open_in_editor: "shep.editor.open",
      settings: "shep.panel.toggleSettings",
    };

    const unlisten = listen<string>("menu-event", (event) => {
      // Try action registry first (for shortcuttable actions)
      const actionId = menuActionMap[event.payload];
      if (actionId) {
        const action = getAction(actionId);
        if (action) { action.execute(); return; }
      }

      // Fallback: handle actions not in the shortcut registry
      switch (event.payload) {
        case "new_commands":
          useTerminalStore.getState().addPanelTab("commands");
          break;
        case "new_git":
          useTerminalStore.getState().addPanelTab("git");
          break;
        case "check_updates":
          void useUpdateStore.getState().checkForUpdate().then(() => {
            const { status, availableVersion } = useUpdateStore.getState();
            if (status === "available" && availableVersion) {
              pushNotice(
                { tone: "info", title: "Update available", message: `Version ${availableVersion} is ready to download` },
                { durationMs: 8000 },
              );
            } else if (status === "idle") {
              pushNotice({ tone: "success", title: "You're up to date", message: "No updates available" });
            }
          });
          break;
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, [pushNotice]);

  // Register all shortcuttable actions into the action registry
  useEffect(() => {
    registerActions({
      newShell: handleNewShell,
      newAssistant: handleNewAssistant,
      closeTab,
      openInEditor: handleOpenInEditor,
    });
  }, [handleNewShell, handleNewAssistant, closeTab, handleOpenInEditor]);

  // Global keyboard shortcut listener (capture phase — fires before xterm.js)
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      // Skip while ShortcutEditor is recording a new key combo
      if (useShortcutStore.getState().recording) return;
      // Skip modifier-only presses
      if (["Control", "Alt", "Shift", "Meta"].includes(ev.key)) return;
      // Skip if user is typing in an input/textarea (but not terminal)
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const combo = eventToCombo(ev);
      if (!combo) return;

      const reverseMap = useShortcutStore.getState().getReverseMap();
      const actionId = reverseMap.get(combo);
      if (!actionId) return;

      const action = getAction(actionId);
      if (!action) return;

      ev.preventDefault();
      ev.stopPropagation();
      action.execute();
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  const showOverlay = settingsActive || usagePanelActive || portsPanelActive || sessionHistoryActive || filePreviewActive;

  return (
    <div className="app-shell">
      <NoticeCenter />
      <div
        className="drag-region"
        aria-hidden="true"
        onMouseDown={(e) => {
          if (e.buttons === 1) {
            if (e.detail === 2) {
              getCurrentWindow().toggleMaximize();
            } else {
              getCurrentWindow().startDragging();
            }
          }
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); useUIStore.getState().toggleSidebar(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-1 rounded opacity-30 hover:opacity-70 transition-opacity z-20"
          title={sidebarVisible ? "Hide sidebar (Cmd+B)" : "Show sidebar (Cmd+B)"}
          aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarVisible ? (
            <PanelLeft size={20} />
          ) : (
            <PanelLeftOpen size={20} />
          )}
        </button>
      </div>

      <div className="app-shell__frame">
        {sidebarVisible && (
          <Sidebar
            repos={repos}
            groups={groups}
            activeRepoPath={activeRepoPath}
            activeTabId={showOverlay ? null : activeTabId}
            commands={commands}
            onSelectRepo={handleSelectRepo}
            onAddProject={handleAddProject}
            onRemoveProject={handleRemoveProject}
            onNewAssistant={handleNewAssistant}
            onOpenInEditor={handleOpenInEditor}
            onSelectTab={handleSelectSidebarTab}
            onCloseTab={handleCloseTab}
            onNewShell={handleNewShell}
            onRenameGroup={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onMoveToGroup={handleMoveToGroup}
          />
        )}

        <div className="workspace-panel">
          <TabBar
            onClose={handleCloseTab}
            onNewShell={handleNewShell}
            onNewAssistant={handleNewAssistant}
            onNewCommands={() => useTerminalStore.getState().addPanelTab("commands")}
            onNewGit={() => useTerminalStore.getState().addPanelTab("git")}
            onOpenInEditor={() => { const p = useTerminalStore.getState().activeProjectPath; if (p) handleOpenInEditor(p); }}
            onBranchTab={branchTab}
          />

          <div ref={terminalContainerRef} className="terminal-stage">
            {/* Global overlays (Settings, Usage, Ports) */}
            {settingsActive && (
              <Suspense fallback={<PanelLoader />}>
                <SettingsPanel />
              </Suspense>
            )}
            {usagePanelActive && (
              <Suspense fallback={<PanelLoader />}>
                <UsagePanel />
              </Suspense>
            )}
            {portsPanelActive && (
              <Suspense fallback={<PanelLoader />}>
                <PortsPanel />
              </Suspense>
            )}
            {sessionHistoryActive && <SessionHistoryPanel onResumeSession={handleResumeSession} />}
            {filePreviewActive && <FilePreviewPanel />}

            {/* Local panel tabs (Git, Commands, Launcher) */}
            {!showOverlay && activeTab?.kind === "git" && (
              <Suspense fallback={<PanelLoader />}>
                <GitPanel />
              </Suspense>
            )}
            {!showOverlay && activeTab?.kind === "commands" && (
              <Suspense fallback={<PanelLoader />}>
                <CommandsPanel
                  commands={commands}
                  onStartCommand={handleStartCommand}
                  onStopCommand={stopCommand}
                  onCreateCommand={handleCreateCommand}
                  onUpdateCommand={handleUpdateCommand}
                  onDeleteCommand={handleDeleteCommand}
                  onStartAllCommands={handleStartAllCommands}
                  onStopAllCommands={handleStopAllCommands}
                />
              </Suspense>
            )}
            {!showOverlay && activeTab?.kind === "launcher" && (
              <Suspense fallback={<PanelLoader />}>
                <SessionLauncher onStartSession={handleStartSession} onResumeSession={handleResumeSession} />
              </Suspense>
            )}

            {!showOverlay && !activeTab && tabs.length === 0 && (
              <div className="terminal-empty">
                {activeRepoPath
                  ? "Launch an assistant or open a terminal"
                  : "Select or add a project to begin"}
              </div>
            )}
            {allTerminalTabs.map((tab) => (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={{
                  display:
                    !showOverlay && tab.repoPath === activeProjectPath && tab.id === activeTabId
                      ? "block"
                      : "none",
                }}
              >
                <TerminalErrorBoundary>
                  <TerminalView
                    ptyId={tab.ptyId}
                    visible={!showOverlay && tab.repoPath === activeProjectPath && tab.id === activeTabId}
                  />
                </TerminalErrorBoundary>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
