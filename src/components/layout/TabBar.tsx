import { useTerminalStore } from "../../stores/useTerminalStore";
import { useUIStore } from "../../stores/useUIStore";
import { useGitStore } from "../../stores/useGitStore";
import { GitBranch, Terminal } from "lucide-react";
import GearIcon from "../sidebar/icons/GearIcon";
import { assistantLogoSrc } from "../../lib/assistantLogos";

interface TabBarProps {
  onClose: (tabId: string) => void;
  onNewShell: () => void;
}

export default function TabBar({
  onClose,
  onNewShell,
}: TabBarProps) {
  const projectTerminals = useTerminalStore(
    (s) => (s.activeProjectPath ? s.projectState[s.activeProjectPath] : null),
  );
  const tabs = projectTerminals?.tabs ?? [];
  const activeTabId = projectTerminals?.activeTabId ?? null;
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);

  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen);
  const settingsActive = useUIStore((s) => s.settingsActive);
  const activateSettings = useUIStore((s) => s.activateSettings);
  const closeSettingsTab = useUIStore((s) => s.closeSettingsTab);

  const gitPanelOpen = useUIStore((s) => s.gitPanelOpen);
  const gitPanelActive = useUIStore((s) => s.gitPanelActive);
  const activateGitPanel = useUIStore((s) => s.activateGitPanel);
  const closeGitPanel = useUIStore((s) => s.closeGitPanel);
  const openGitPanel = useUIStore((s) => s.openGitPanel);

  const launcherOpen = useUIStore((s) => s.launcherOpen);
  const launcherActive = useUIStore((s) => s.launcherActive);
  const activateLauncher = useUIStore((s) => s.activateLauncher);
  const closeLauncher = useUIStore((s) => s.closeLauncher);

  const commandsPanelOpen = useUIStore((s) => s.commandsPanelOpen);
  const commandsPanelActive = useUIStore((s) => s.commandsPanelActive);
  const activateCommandsPanel = useUIStore((s) => s.activateCommandsPanel);
  const closeCommandsPanel = useUIStore((s) => s.closeCommandsPanel);

  // Git status for the active tab
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeTabCwd = activeTab?.worktreePath ?? activeTab?.repoPath ?? null;
  const projectGitStatus = useGitStore((s) => s.projectGitStatus);
  const gitStatus = activeTabCwd ? projectGitStatus[activeTabCwd] : null;

  const anyOverlay = settingsActive || launcherActive || gitPanelActive || commandsPanelActive;

  const handleSelectTab = (tabId: string) => {
    useUIStore.getState().deactivateSettings();
    useUIStore.getState().deactivateLauncher();
    useUIStore.getState().deactivateGitPanel();
    useUIStore.getState().deactivateCommandsPanel();
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) useTerminalStore.getState().clearTabBell(tab.ptyId);
  };

  return (
    <div className="tab-bar">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId && !anyOverlay;
          const logoUrl = tab.assistantId
            ? assistantLogoSrc[tab.assistantId]
            : null;

          return (
            <div
              key={tab.id}
              className={`tab ${isActive ? "active" : ""}`}
              onClick={() => handleSelectTab(tab.id)}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" width={12} height={12} />
              ) : null}
              <span className="truncate max-w-32">{tab.label}</span>
              <button
                className="icon-btn ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}

        {launcherOpen && (
          <div
            className={`tab ${launcherActive ? "active" : ""}`}
            onClick={activateLauncher}
          >
            <span>+</span>
            <span>New Session</span>
            <button
              className="icon-btn ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                closeLauncher();
              }}
            >
              ×
            </button>
          </div>
        )}

        {gitPanelOpen && (
          <div
            className={`tab ${gitPanelActive ? "active" : ""}`}
            onClick={activateGitPanel}
          >
            <GitBranch size={12} />
            <span>Git</span>
            <button
              className="icon-btn ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                closeGitPanel();
              }}
            >
              ×
            </button>
          </div>
        )}

        {commandsPanelOpen && (
          <div
            className={`tab ${commandsPanelActive ? "active" : ""}`}
            onClick={activateCommandsPanel}
          >
            <Terminal size={12} />
            <span>Commands</span>
            <button
              className="icon-btn ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                closeCommandsPanel();
              }}
            >
              ×
            </button>
          </div>
        )}

        {settingsTabOpen && (
          <div
            className={`tab ${settingsActive ? "active" : ""}`}
            onClick={activateSettings}
          >
            <GearIcon size={12} />
            <span>Settings</span>
            <button
              className="icon-btn ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                closeSettingsTab();
              }}
            >
              ×
            </button>
          </div>
        )}

        <button
          className="tab"
          onClick={onNewShell}
          title="New Terminal"
        >
          +
        </button>
      </div>

      {gitStatus?.is_git_repo && (
        <div
          className="flex items-center gap-1.5 shrink-0 text-xs pl-3 border-l border-white/8 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={openGitPanel}
          title="Open Git panel"
        >
          <GitBranch size={12} />
          <span className="truncate max-w-32">{gitStatus.branch}</span>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: gitStatus.dirty
                ? "rgb(251, 191, 36)"
                : "rgb(74, 222, 128)",
            }}
          />
        </div>
      )}
    </div>
  );
}
