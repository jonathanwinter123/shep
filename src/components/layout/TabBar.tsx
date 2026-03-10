import { useTerminalStore } from "../../stores/useTerminalStore";
import { useCommandStore } from "../../stores/useCommandStore";
import { useUIStore } from "../../stores/useUIStore";
import type { CommandState, CommandStatus } from "../../lib/types";

const EMPTY_COMMANDS: CommandState[] = [];
import ClaudeLogo from "../sidebar/icons/ClaudeLogo";
import CodexLogo from "../sidebar/icons/CodexLogo";
import GeminiLogo from "../sidebar/icons/GeminiLogo";
import GearIcon from "../sidebar/icons/GearIcon";

const statusColors: Record<CommandStatus, string> = {
  running: "bg-green-500",
  stopped: "bg-gray-500",
  crashed: "bg-red-500",
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

  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const closeSettings = useUIStore((s) => s.closeSettings);

  const commands = useCommandStore(
    (s) => (s.activeProjectPath ? s.projectCommands[s.activeProjectPath] ?? EMPTY_COMMANDS : EMPTY_COMMANDS),
  );

  const handleSelectTab = (tabId: string) => {
    closeSettings();
    setActiveTab(tabId);
  };

  return (
    <div className="tab-bar">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId && !settingsOpen;
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md cursor-pointer text-sm select-none shrink-0 border transition-colors ${
                isActive
                  ? "border-white/12 bg-white/8 text-white"
                  : "border-transparent text-slate-300/70 hover:text-slate-100 hover:bg-white/5"
              }`}
              onClick={() => handleSelectTab(tab.id)}
            >
              {AssistantLogo ? (
                <span className="text-slate-300/70">
                  <AssistantLogo size={12} />
                </span>
              ) : tab.commandName ? (
                <span
                  className={`w-2 h-2 rounded-full ${statusColors[status]}`}
                />
              ) : null}
              <span className="truncate max-w-32">{tab.label}</span>
              <button
                className="ml-1 text-slate-400/70 hover:text-white"
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

        {settingsOpen && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-md cursor-pointer text-sm select-none shrink-0 border transition-colors border-white/12 bg-white/8 text-white">
            <span className="text-slate-300/70">
              <GearIcon size={12} />
            </span>
            <span>Settings</span>
            <button
              className="ml-1 text-slate-400/70 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                closeSettings();
              }}
            >
              ×
            </button>
          </div>
        )}

        <button
          className="glass-button ml-1 rounded-md px-3 py-2 text-slate-300/72 hover:text-white text-sm shrink-0"
          onClick={onNewShell}
          title="New Terminal"
        >
          +
        </button>
      </div>

    </div>
  );
}
