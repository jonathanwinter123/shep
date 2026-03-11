import { useEffect, useCallback, useRef, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Sidebar from "../sidebar/Sidebar";
import TabBar from "./TabBar";
import TerminalView from "../terminal/TerminalView";
import TerminalErrorBoundary from "../terminal/TerminalErrorBoundary";
import SettingsPanel from "../settings/SettingsPanel";
import SessionLauncher from "../session/SessionLauncher";
import ShepLogo from "../sidebar/icons/ShepLogo";
import { useRepoStore } from "../../stores/useRepoStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useUIStore } from "../../stores/useUIStore";
import { usePty } from "../../hooks/usePty";
import { useThemeApplicator } from "../../hooks/useThemeApplicator";
import { useGitPolling } from "../../hooks/useGitPolling";
import { computeTerminalSize } from "../../lib/terminalMeasure";
import { getUsername, getComputerName } from "../../lib/tauri";

import type { CommandState, TerminalTab, SessionMode } from "../../lib/types";
const LAST_REPO_STORAGE_KEY = "shep:last-repo-path";

// Stable empty arrays to avoid infinite re-render loops with zustand v5's
// useSyncExternalStore — selectors must return the same reference for the same state.
const EMPTY_TABS: TerminalTab[] = [];
const EMPTY_COMMANDS: CommandState[] = [];

export default function AppShell() {
  useThemeApplicator();

  const { repos, activeRepoPath, fetchRepos, openRepo, addRepo } =
    useRepoStore();
  const { startCommand, stopCommand, spawnBlankShell, launchAssistant, closeTab } =
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

  // Git status polling: project roots + active tab's worktree path
  const activeTabWorktree = activeProjectTerminals
    ? activeProjectTerminals.tabs.find((t) => t.id === activeProjectTerminals.activeTabId)?.worktreePath
    : null;
  const gitPollPaths = useMemo(() => {
    const paths = repos.filter((r) => r.valid).map((r) => r.path);
    if (activeTabWorktree && !paths.includes(activeTabWorktree)) {
      paths.push(activeTabWorktree);
    }
    return paths;
  }, [repos, activeTabWorktree]);
  useGitPolling(gitPollPaths);

  // Derive allTabs via useMemo instead of a selector that returns a new array
  // every call — zustand v5 + useSyncExternalStore would infinite-loop otherwise.
  const projectState = useTerminalStore((s) => s.projectState);
  const allTabs = useMemo(() => {
    const all: TerminalTab[] = [];
    for (const project of Object.values(projectState)) {
      all.push(...project.tabs);
    }
    return all;
  }, [projectState]);

  const commands = useCommandStore(
    (s) => (s.activeProjectPath ? s.projectCommands[s.activeProjectPath] ?? EMPTY_COMMANDS : EMPTY_COMMANDS),
  );

  const setActiveTab = useTerminalStore((s) => s.setActiveTab);

  const settingsActive = useUIStore((s) => s.settingsActive);
  const launcherActive = useUIStore((s) => s.launcherActive);

  useEffect(() => {
    fetchRepos();
    getUsername().then((name) => useUIStore.getState().setUsername(name));
    getComputerName().then((name) => useUIStore.getState().setComputerName(name));
  }, [fetchRepos]);

  const handleSelectRepo = useCallback(
    async (repoPath: string) => {
      if (repoPath === activeRepoPath) return;

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
    },
    [activeRepoPath, openRepo, startCommand, getTerminalDimensions],
  );

  const handleAddProject = useCallback(
    async (repoPath: string) => {
      const config = await addRepo(repoPath);
      // addRepo sets activeRepoPath in the repo store, get the canonical path
      const canonicalPath = useRepoStore.getState().activeRepoPath!;
      useTerminalStore.getState().switchProject(canonicalPath);
      useCommandStore.getState().switchProject(canonicalPath);
      useCommandStore.getState().loadCommands(canonicalPath, config.commands);
    },
    [addRepo],
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
          },
          cols,
          rows,
        );
      }
    },
    [startCommand, getTerminalDimensions],
  );

  const handleFocusCommand = useCallback(
    (name: string) => {
      const state = useTerminalStore.getState();
      const path = state.activeProjectPath;
      if (!path) return;
      const projectTabs = state.projectState[path]?.tabs ?? [];
      const tab = projectTabs.find((t) => t.commandName === name);
      if (tab) {
        setActiveTab(tab.id);
      } else {
        handleStartCommand(name);
      }
    },
    [setActiveTab, handleStartCommand],
  );

  const handleNewAssistant = useCallback(() => {
    useUIStore.getState().openLauncher();
  }, []);

  const handleStartSession = useCallback(
    (assistantId: string, mode: SessionMode, worktreePath: string | null) => {
      const { cols, rows } = getTerminalDimensions();
      launchAssistant(assistantId, cols, rows, mode, worktreePath);
      useUIStore.getState().closeLauncher();
    },
    [launchAssistant, getTerminalDimensions],
  );

  const handleNewShell = useCallback(() => {
    const { cols, rows } = getTerminalDimensions();
    spawnBlankShell(cols, rows);
  }, [spawnBlankShell, getTerminalDimensions]);

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

  const showOverlay = settingsActive || launcherActive;

  return (
    <div className="app-shell">
      <div
        className="drag-region"
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
        <span className="drag-region__logo"><ShepLogo size={18} /></span>
      </div>
      <div className="app-shell__ambient app-shell__ambient--blue" />
      <div className="app-shell__ambient app-shell__ambient--mint" />
      <div className="app-shell__ambient app-shell__ambient--ember" />

      <div className="app-shell__frame">
        <Sidebar
          repos={repos}
          activeRepoPath={activeRepoPath}
          tabs={tabs}
          activeTabId={activeTabId}
          commands={commands}
          onSelectRepo={handleSelectRepo}
          onAddProject={handleAddProject}
          onNewAssistant={handleNewAssistant}
          onSelectTab={setActiveTab}
          onNewShell={handleNewShell}
          onStartCommand={handleStartCommand}
          onStopCommand={stopCommand}
          onFocusCommand={handleFocusCommand}
        />

        <div className="workspace-panel">
          <TabBar
            onClose={closeTab}
            onNewShell={handleNewShell}
          />

          <div ref={terminalContainerRef} className="terminal-stage">
            {settingsActive && <SettingsPanel />}
            {launcherActive && <SessionLauncher onStartSession={handleStartSession} />}

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
