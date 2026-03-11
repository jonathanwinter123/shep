import { useTerminalStore } from "../../stores/useTerminalStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useUIStore } from "../../stores/useUIStore";
import type { CommandState, CommandStatus } from "../../lib/types";
import { Circle } from "lucide-react";

const EMPTY_COMMANDS: CommandState[] = [];
import ClaudeLogo from "../sidebar/icons/ClaudeLogo";
import CodexLogo from "../sidebar/icons/CodexLogo";
import GeminiLogo from "../sidebar/icons/GeminiLogo";
import GearIcon from "../sidebar/icons/GearIcon";

const statusColor: Record<CommandStatus, string> = {
  running: "var(--status-running)",
  stopped: "var(--status-stopped)",
  crashed: "var(--status-crashed)",
};

const assistantLogos: Record<string, React.ComponentType<{ size?: number }>> = {
  claude: ClaudeLogo,
  codex: CodexLogo,
  gemini: GeminiLogo,
};

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
  const deactivateSettings = useUIStore((s) => s.deactivateSettings);
  const closeSettingsTab = useUIStore((s) => s.closeSettingsTab);

  const launcherOpen = useUIStore((s) => s.launcherOpen);
  const launcherActive = useUIStore((s) => s.launcherActive);
  const activateLauncher = useUIStore((s) => s.activateLauncher);
  const closeLauncher = useUIStore((s) => s.closeLauncher);

  const commands = useCommandStore(
    (s) => (s.activeProjectPath ? s.projectCommands[s.activeProjectPath] ?? EMPTY_COMMANDS : EMPTY_COMMANDS),
  );

  const handleSelectTab = (tabId: string) => {
    deactivateSettings();
    useUIStore.getState().deactivateLauncher();
    setActiveTab(tabId);
  };

  return (
    <div className="tab-bar">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId && !settingsActive && !launcherActive;
          const command = tab.commandName
            ? commands.find((c) => c.name === tab.commandName)
            : null;
          const status = command?.status ?? "stopped";
          const AssistantLogo = tab.assistantId
            ? assistantLogos[tab.assistantId]
            : null;

          return (
            <div
              key={tab.id}
              className={`tab ${isActive ? "active" : ""}`}
              onClick={() => handleSelectTab(tab.id)}
            >
              {AssistantLogo ? (
                <AssistantLogo size={12} />
              ) : tab.commandName ? (
                <Circle size={8} fill={statusColor[status]} stroke="none" />
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
    </div>
  );
}
