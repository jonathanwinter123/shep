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
import UsageHeader from "../usage/UsageHeader";
import UsagePanel from "../usage/UsagePanel";
// Logo removed — usage indicators now occupy the drag region
import { useRepoStore } from "../../stores/useRepoStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";
import { usePty } from "../../hooks/usePty";
import { useThemeApplicator } from "../../hooks/useThemeApplicator";
import { useGitPolling } from "../../hooks/useGitPolling";
import { computeTerminalSize } from "../../lib/terminalMeasure";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { getUsername, getComputerName, openInEditor, saveWorkspace, shutdownAndQuit } from "../../lib/tauri";
import { useEditorStore } from "../../stores/useEditorStore";
import { useTerminalSettingsStore } from "../../stores/useTerminalSettingsStore";
import { useUsageStore } from "../../stores/useUsageStore";
import { initNotifications } from "../../lib/notifications";
import { getErrorMessage } from "../../lib/errors";
import { useNoticeStore } from "../../stores/useNoticeStore";

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

  // Git status polling: project roots + all active worktree paths
  const gitPollPaths = useMemo(() => {
    const paths = repos.filter((r) => r.valid).map((r) => r.path);
    for (const state of Object.values(projectState)) {
      for (const tab of state.tabs) {
        if (tab.worktreePath && !paths.includes(tab.worktreePath)) {
          paths.push(tab.worktreePath);
        }
      }
    }
    return paths;
  }, [repos, projectState]);
  useGitPolling(gitPollPaths);
  const allTabs = useMemo(() => {
    const all: TerminalTab[] = [];
    for (const project of Object.values(projectState)) {
      all.push(...project.tabs);
    }

    // Keep terminal DOM order stable even when the visible tab order changes.
    // xterm renderers can fail to repaint cleanly when their mounted nodes are
    // shuffled around in the document during tab drag/reorder operations.
    return all.sort((a, b) => a.ptyId - b.ptyId || a.id.localeCompare(b.id));
  }, [projectState]);

  const commands = useCommandStore(
    (s) => (s.activeProjectPath ? s.projectCommands[s.activeProjectPath] ?? EMPTY_COMMANDS : EMPTY_COMMANDS),
  );

  const setActiveTab = useTerminalStore((s) => s.setActiveTab);

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

  const settingsActive = useUIStore((s) => s.settingsActive);
  const gitPanelActive = useUIStore((s) => s.gitPanelActive);
  const commandsPanelActive = useUIStore((s) => s.commandsPanelActive);
  const launcherActive = useUIStore((s) => s.launcherActive);
  const usagePanelActive = useUIStore((s) => s.usagePanelActive);
  const loadEditorSettings = useEditorStore((s) => s.loadSettings);
  const loadTerminalSettings = useTerminalSettingsStore((s) => s.loadSettings);
  const fetchUsageSnapshots = useUsageStore((s) => s.fetchSnapshots);

  useEffect(() => {
    fetchRepos();
    void loadEditorSettings();
    void loadTerminalSettings();
    void fetchUsageSnapshots();
    void initNotifications();
    getUsername().then((name) => useUIStore.getState().setUsername(name));
    getComputerName().then((name) => useUIStore.getState().setComputerName(name));
  }, [fetchRepos, loadEditorSettings, loadTerminalSettings, fetchUsageSnapshots]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchUsageSnapshots();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [fetchUsageSnapshots]);

  const handleSelectRepo = useCallback(
    async (repoPath: string) => {
      if (repoPath === activeRepoPath) return;

      try {
        const isFirstVisit = !useCommandStore.getState().hasProject(repoPath);

        const config = await openRepo(repoPath);
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
        const canonicalPath = useRepoStore.getState().activeRepoPath!;
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
    useUIStore.getState().closeUsagePanel();
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) useTerminalStore.getState().clearTabBell(tab.ptyId);
  }, [setActiveTab, tabs]);

  const handleNewAssistant = useCallback(() => {
    useUIStore.getState().openLauncher();
  }, []);

  const handleStartSession = useCallback(
    async (assistantId: string, mode: SessionMode, worktreePath: string | null) => {
      const { cols, rows } = getTerminalDimensions();
      const ptyId = await launchAssistant(assistantId, cols, rows, mode, worktreePath);
      if (ptyId) {
        useUIStore.getState().closeLauncher();
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
    useUIStore.getState().closeUsagePanel();
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
    if (activeRepoPath) {
      restoreAttemptedRef.current = true;
      window.localStorage.setItem(LAST_REPO_STORAGE_KEY, activeRepoPath);
    }
  }, [activeRepoPath]);

  useEffect(() => {
    if (restoreAttemptedRef.current || activeRepoPath || repos.length === 0) return;

    restoreAttemptedRef.current = true;

    const storedRepoPath = window.localStorage.getItem(LAST_REPO_STORAGE_KEY);
    const initialRepo =
      repos.find((repo) => repo.valid && repo.path === storedRepoPath) ??
      repos.find((repo) => repo.valid);

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

  const showOverlay = settingsActive || gitPanelActive || commandsPanelActive || launcherActive || usagePanelActive;

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
        <UsageHeader />
      </div>
      <div className="app-shell__frame">
        <Sidebar
          repos={repos}
          activeRepoPath={activeRepoPath}
          tabs={tabs}
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
            {launcherActive && <SessionLauncher onStartSession={handleStartSession} />}
            {usagePanelActive && <UsagePanel />}

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
