import type { TerminalTab } from "../../lib/types";
import TerminalItem from "./TerminalItem";

interface TerminalListProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onNewShell: () => void;
}

export default function TerminalList({
  tabs,
  activeTabId,
  onSelectTab,
  onNewShell,
}: TerminalListProps) {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      {tabs.map((tab) => (
        <TerminalItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => onSelectTab(tab.id)}
        />
      ))}
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
        onClick={onNewShell}
      >
        <span className="text-lg leading-none">+</span>
        <span>New Terminal</span>
      </button>
    </div>
  );
}
