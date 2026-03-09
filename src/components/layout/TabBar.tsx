import { useTerminalStore } from "../../stores/useTerminalStore";
import { useCommandStore } from "../../stores/useCommandStore";
import type { CommandStatus } from "../../lib/types";
import ClaudeLogo from "../sidebar/icons/ClaudeLogo";
import CodexLogo from "../sidebar/icons/CodexLogo";
import GeminiLogo from "../sidebar/icons/GeminiLogo";

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

export default function TabBar({ onClose, onNewShell }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab } = useTerminalStore();
  const commands = useCommandStore((s) => s.commands);

  return (
    <div className="flex items-center bg-gray-800/50 border-b border-white/5 h-9 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
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
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-white/5 text-sm select-none shrink-0 transition-colors ${
              isActive
                ? "bg-[#1a1b26] text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {AssistantLogo ? (
              <span className="text-gray-400">
                <AssistantLogo size={12} />
              </span>
            ) : tab.commandName ? (
              <span
                className={`w-2 h-2 rounded-full ${statusColors[status]}`}
              />
            ) : null}
            <span className="truncate max-w-32">{tab.label}</span>
            <button
              className="ml-1 text-gray-500 hover:text-white"
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
      <button
        className="px-3 py-1.5 text-gray-500 hover:text-white text-sm"
        onClick={onNewShell}
        title="New Terminal"
      >
        +
      </button>
    </div>
  );
}
