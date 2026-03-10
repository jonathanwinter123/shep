import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import Sidebar from "../sidebar/Sidebar";
import TabBar from "./TabBar";
import TerminalView from "../terminal/TerminalView";
import { useRepoStore } from "../../stores/useRepoStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { usePty } from "../../hooks/usePty";
import { computeTerminalSize } from "../../lib/terminalMeasure";

import type { CommandState, TerminalTab } from "../../lib/types";
const LAST_REPO_STORAGE_KEY = "shep:last-repo-path";
const TERMINAL_OPACITY_STORAGE_KEY = "shep:terminal-opacity";

// Stable empty arrays to avoid infinite re-render loops with zustand v5's
// useSyncExternalStore — selectors must return the same reference for the same state.
const EMPTY_TABS: TerminalTab[] = [];
const EMPTY_COMMANDS: CommandState[] = [];

export default function AppShell() {
  const { repos, activeRepoPath, fetchRepos, openRepo, addRepo, removeRepo } =
    useRepoStore();
  const { startCommand, stopCommand, spawnBlankShell, launchAssistant, closeTab, killProjectPtys } =
    usePty();
  const restoreAttemptedRef = useRef(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [terminalOpacity, setTerminalOpacity] = useState(() => {
    const stored = window.localStorage.getItem(TERMINAL_OPACITY_STORAGE_KEY);
    const value = stored ? Number.parseInt(stored, 10) : 68;
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 68;
  });

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

  useEffect(() => {
    fetchRepos();
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

  const handleRemoveProject = useCallback(
    async (repoPath: string) => {
      await killProjectPtys(repoPath);
      useTerminalStore.getState().removeProject(repoPath);
      useCommandStore.getState().removeProject(repoPath);
      await removeRepo(repoPath);
    },
    [killProjectPtys, removeRepo],
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

  const handleLaunchAssistant = useCallback(
    (assistantId: string) => {
      const { cols, rows } = getTerminalDimensions();
      launchAssistant(assistantId, cols, rows);
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
    window.localStorage.setItem(
      TERMINAL_OPACITY_STORAGE_KEY,
      String(terminalOpacity),
    );
  }, [terminalOpacity]);

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

  return (
    <div className="app-shell">
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
          onRemoveProject={handleRemoveProject}
          onLaunchAssistant={handleLaunchAssistant}
          onSelectTab={setActiveTab}
          onCloseTab={closeTab}
          onNewShell={handleNewShell}
          onStartCommand={handleStartCommand}
          onStopCommand={stopCommand}
          onFocusCommand={handleFocusCommand}
        />

        <div className="workspace-panel">
          <TabBar
            onClose={closeTab}
            onNewShell={handleNewShell}
            terminalOpacity={terminalOpacity}
            onTerminalOpacityChange={setTerminalOpacity}
          />

          <div ref={terminalContainerRef} className="terminal-stage">
            {tabs.length === 0 ? (
              <div className="terminal-empty">
                {activeRepoPath
                  ? "Launch an assistant or open a terminal"
                  : "Select or add a project to begin"}
              </div>
            ) : null}
            {allTabs.map((tab) => (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={{
                  display:
                    tab.repoPath === activeProjectPath && tab.id === activeTabId
                      ? "block"
                      : "none",
                }}
              >
                <TerminalView
                  ptyId={tab.ptyId}
                  visible={tab.repoPath === activeProjectPath && tab.id === activeTabId}
                  opacity={terminalOpacity}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
