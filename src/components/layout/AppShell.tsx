import { useEffect, useCallback, useRef } from "react";
import Sidebar from "../sidebar/Sidebar";
import TabBar from "./TabBar";
import TerminalView from "../terminal/TerminalView";
import { useRepoStore } from "../../stores/useRepoStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { usePty } from "../../hooks/usePty";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const LAST_REPO_STORAGE_KEY = "shep:last-repo-path";

export default function AppShell() {
  const { repos, activeRepoPath, fetchRepos, openRepo, addRepo, removeRepo } =
    useRepoStore();
  const { commands, loadCommands, clearCommands } = useCommandStore();
  const { tabs, activeTabId, clearTabs, setActiveTab } = useTerminalStore();
  const {
    startCommand,
    stopCommand,
    spawnBlankShell,
    launchAssistant,
    closeTab,
    killAllPtys,
  } = usePty();
  const restoreAttemptedRef = useRef(false);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleSelectRepo = useCallback(
    async (repoPath: string) => {
      if (repoPath === activeRepoPath) return;

      await killAllPtys();
      clearTabs();
      clearCommands();

      const config = await openRepo(repoPath);
      loadCommands(config.commands);

      for (const cmd of config.commands) {
        if (cmd.autostart) {
          await startCommand(cmd, DEFAULT_COLS, DEFAULT_ROWS);
        }
      }
    },
    [
      activeRepoPath,
      killAllPtys,
      clearTabs,
      clearCommands,
      openRepo,
      loadCommands,
      startCommand,
    ],
  );

  const handleAddProject = useCallback(
    async (repoPath: string) => {
      await killAllPtys();
      clearTabs();
      clearCommands();

      const config = await addRepo(repoPath);
      loadCommands(config.commands);
    },
    [killAllPtys, clearTabs, clearCommands, addRepo, loadCommands],
  );

  const handleRemoveProject = useCallback(
    async (repoPath: string) => {
      if (repoPath === activeRepoPath) {
        await killAllPtys();
        clearTabs();
        clearCommands();
      }
      await removeRepo(repoPath);
    },
    [activeRepoPath, killAllPtys, clearTabs, clearCommands, removeRepo],
  );

  const handleStartCommand = useCallback(
    (name: string) => {
      const cmd = useCommandStore.getState().commands.find((c) => c.name === name);
      if (cmd) {
        startCommand(
          {
            name: cmd.name,
            command: cmd.command,
            autostart: cmd.autostart,
            env: cmd.env,
          },
          DEFAULT_COLS,
          DEFAULT_ROWS,
        );
      }
    },
    [startCommand],
  );

  const handleFocusCommand = useCallback(
    (name: string) => {
      const tab = useTerminalStore.getState().tabs.find(
        (t) => t.commandName === name,
      );
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
      launchAssistant(assistantId, DEFAULT_COLS, DEFAULT_ROWS);
    },
    [launchAssistant],
  );

  const handleNewShell = useCallback(() => {
    spawnBlankShell(DEFAULT_COLS, DEFAULT_ROWS);
  }, [spawnBlankShell]);

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

  return (
    <div className="h-screen flex bg-[#1a1b26] text-white overflow-hidden">
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
        onNewShell={handleNewShell}
        onStartCommand={handleStartCommand}
        onStopCommand={stopCommand}
        onFocusCommand={handleFocusCommand}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TabBar onClose={closeTab} onNewShell={handleNewShell} />

        <div className="flex-1 relative">
          {tabs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {activeRepoPath
                ? "Launch an assistant or open a terminal"
                : "Select or add a project to begin"}
            </div>
          ) : (
            tabs.map((tab) => (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={{
                  display: tab.id === activeTabId ? "block" : "none",
                }}
              >
                <TerminalView
                  ptyId={tab.ptyId}
                  visible={tab.id === activeTabId}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
