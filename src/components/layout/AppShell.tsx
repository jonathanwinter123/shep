import { useEffect, useCallback, useRef, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Sidebar from "../sidebar/Sidebar";
import TabBar from "./TabBar";
import TerminalView from "../terminal/TerminalView";
import TerminalErrorBoundary from "../terminal/TerminalErrorBoundary";
import SettingsPanel from "../settings/SettingsPanel";
import GitPanel from "../git/GitPanel";
import CommandsPanel from "../commands/CommandsPanel";
import SessionLauncher from "../session/SessionLauncher";
import NoticeCenter from "../shared/NoticeCenter";
import UsagePanel from "../usage/UsagePanel";
import PortsPanel from "../ports/PortsPanel";
import SessionHistoryPanel from "../session/SessionHistoryPanel";
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
import { getUsername, getComputerName, openInEditor, saveWorkspace, shutdownAndQuit, refreshUsageData } from "../../lib/tauri";
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

import type { CommandConfig, CommandState, TerminalTab, SessionMode, WorkspaceConfig } from "../../lib/types";
const LAST_REPO_STORAGE_KEY = "shep:last-repo-path";

// Stable empty arrays to avoid infinite re-render loops with zustand v5's
// useSyncExternalStore — selectors must return the same reference for the same state.
const EMPTY_TABS: TerminalTab[] = [];
const EMPTY_COMMANDS: CommandState[] = [];

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

export default function AppShell() {
  useThemeApplicator();

  const { repos, activeRepoPath, fetchRepos, openRepo, addRepo, removeRepo } =
    useRepoStore();
  const activeConfig = useRepoStore((s) => s.activeConfig);
  const setActiveConfig = useRepoStore((s) => s.setActiveConfig);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const { startCommand, stopCommand, spawnBlankShell, launchAssistant, closeTab, killProjectPtys } =
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
  const allTabs = useMemo(() => {
    const all: TerminalTab[] = [];
    for (const ps of Object.values(projectState)) {
      all.push(...ps.tabs);
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
    settingsActive, gitPanelActive, commandsPanelActive, launcherActive, usagePanelActive, portsPanelActive, sessionHistoryActive, sidebarVisible,
  } = useUIStore(useShallow((s) => ({
    settingsActive: s.settingsActive,
    gitPanelActive: s.gitPanelActive,
    commandsPanelActive: s.commandsPanelActive,
    launcherActive: s.launcherActive,
    usagePanelActive: s.usagePanelActive,
    portsPanelActive: s.portsPanelActive,
    sessionHistoryActive: s.sessionHistoryActive,
    sidebarVisible: s.sidebarVisible,
  })));
  const { loadSettings: loadEditorSettings } = useEditorStore.getState();
  const { loadSettings: loadTerminalSettings } = useTerminalSettingsStore.getState();
  const { fetchSnapshots: fetchUsageSnapshots } = useUsageStore.getState();
  const { loadSettings: loadUsageSettings } = useUsageSettingsStore.getState();

  useEffect(() => {
    fetchRepos();
    void loadEditorSettings();
    void loadTerminalSettings();
    void loadUsageSettings();
    void fetchUsageSnapshots();
    void useShortcutStore.getState().loadSettings();
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
    return () => window.clearTimeout(updateTimer);
  }, [fetchRepos, loadEditorSettings, loadTerminalSettings, loadUsageSettings, fetchUsageSnapshots, pushNotice]);

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

          for (const cmd of config.commands) {
            if (cmd.autostart) {
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
    [activeRepoPath, openRepo, startCommand, getTerminalDimensions, pushNotice],
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
    useUIStore.getState().deactivateSettings();
    useUIStore.getState().deactivateGitPanel();
    useUIStore.getState().deactivateCommandsPanel();
    useUIStore.getState().deactivateLauncher();
    useUIStore.getState().deactivateUsagePanel();
    useUIStore.getState().deactivatePortsPanel();
    useUIStore.getState().deactivateSessionHistory();
    setActiveTab(tabId); // auto-switches workspace if tab is in a different one
    const store = useTerminalStore.getState();
    const allTabs = activeRepoPath ? store.getAllProjectTabs(activeRepoPath) : [];
    const tab = allTabs.find((t) => t.id === tabId);
    if (tab) store.clearTabBell(tab.ptyId);
  }, [setActiveTab, activeRepoPath]);

  const handleNewAssistant = useCallback(() => {
    useUIStore.getState().openLauncher();
  }, []);

  const handleStartSession = useCallback(
    async (assistantId: string, mode: SessionMode) => {
      const { cols, rows } = getTerminalDimensions();
      const ptyId = await launchAssistant(assistantId, cols, rows, mode);
      if (ptyId) {
        // Close the launcher tab and deactivate all overlays so the new
        // terminal tab is immediately visible. closeLauncher() alone would
        // call activateNextOpen() which can re-activate another panel
        // (e.g. commands), hiding the tab we just created.
        const ui = useUIStore.getState();
        ui.deactivateSettings();
        ui.deactivateLauncher();
        ui.deactivateGitPanel();
        ui.deactivateCommandsPanel();
        ui.deactivateUsagePanel();
        ui.deactivatePortsPanel();
        ui.deactivateSessionHistory();
        useUIStore.setState({ launcherOpen: false });
        return true;
      }
      return false;
    },
    [launchAssistant, getTerminalDimensions],
  );

  const handleResumeSession = useCallback(
    async (sessionId: string) => {
      const { cols, rows } = getTerminalDimensions();
      const ptyId = await launchAssistant("claude", cols, rows, "standard", sessionId);
      if (ptyId) {
        const ui = useUIStore.getState();
        ui.deactivateSettings();
        ui.deactivateLauncher();
        ui.deactivateGitPanel();
        ui.deactivateCommandsPanel();
        ui.deactivateUsagePanel();
        ui.deactivatePortsPanel();
        ui.deactivateSessionHistory();
        useUIStore.setState({ launcherOpen: false });
        return true;
      }
      return false;
    },
    [launchAssistant, getTerminalDimensions],
  );

  const handleNewShell = useCallback(() => {
    useUIStore.getState().deactivateSettings();
    useUIStore.getState().deactivateLauncher();
    useUIStore.getState().deactivateGitPanel();
    useUIStore.getState().deactivateCommandsPanel();
    useUIStore.getState().deactivateUsagePanel();
    useUIStore.getState().deactivatePortsPanel();
    useUIStore.getState().deactivateSessionHistory();
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
      useUIStore.getState().openSettings();
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
    const unlisten = listen<string>("menu-event", (event) => {
      switch (event.payload) {
        case "new_terminal":
          handleNewShell();
          break;
        case "new_agent":
          handleNewAssistant();
          break;
        case "toggle_sidebar":
          useUIStore.getState().toggleSidebar();
          break;
        case "open_in_editor": {
          const repoPath = useTerminalStore.getState().activeProjectPath;
          if (repoPath) handleOpenInEditor(repoPath);
          break;
        }
        case "settings":
          useUIStore.getState().openSettings();
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
  }, [handleNewShell, handleNewAssistant, handleOpenInEditor, pushNotice]);

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
      // Skip modifier-only presses
      if (["Control", "Alt", "Shift", "Meta"].includes(ev.key)) return;
      // Skip if user is typing in an input/textarea (but not terminal)
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const combo = eventToCombo(ev);
      if (!combo) return;

      const reverseMap = useShortcutStore.getState().buildReverseMap();
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

  const showOverlay = settingsActive || gitPanelActive || commandsPanelActive || launcherActive || usagePanelActive || portsPanelActive || sessionHistoryActive;

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
            activeRepoPath={activeRepoPath}
            activeTabId={showOverlay ? null : activeTabId}
            commands={commands}
            onSelectRepo={handleSelectRepo}
            onAddProject={handleAddProject}
            onRemoveProject={handleRemoveProject}
            onNewAssistant={handleNewAssistant}
            onOpenInEditor={handleOpenInEditor}
            onSelectTab={handleSelectSidebarTab}
            onCloseTab={closeTab}
            onNewShell={handleNewShell}
          />
        )}

        <div className="workspace-panel">
          <TabBar
            onClose={closeTab}
            onNewShell={handleNewShell}
            onNewAssistant={handleNewAssistant}
          />

          <div ref={terminalContainerRef} className="terminal-stage">
            {settingsActive && <SettingsPanel />}
            {gitPanelActive && <GitPanel />}
            {commandsPanelActive && (
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
            )}
            {launcherActive && <SessionLauncher onStartSession={handleStartSession} onResumeSession={handleResumeSession} />}
            {usagePanelActive && <UsagePanel />}
            {portsPanelActive && <PortsPanel />}
            {sessionHistoryActive && <SessionHistoryPanel onResumeSession={handleResumeSession} />}

            {!showOverlay && tabs.length === 0 && (
              <div className="terminal-empty">
                {activeRepoPath
                  ? "Launch an assistant or open a terminal"
                  : "Select or add a project to begin"}
              </div>
            )}
            {allTabs.map((tab) => (
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
