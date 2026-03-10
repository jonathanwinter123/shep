import type { TerminalTab } from "../../lib/types";
import TerminalItem from "./TerminalItem";

interface TerminalListProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewShell: () => void;
}

export default function TerminalList({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewShell,
}: TerminalListProps) {
  return (
    <div className="flex flex-col gap-1 px-1">
      {tabs.map((tab) => (
        <TerminalItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => onSelectTab(tab.id)}
          onClose={() => onCloseTab(tab.id)}
        />
      ))}
      <button
        className="glass-button w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-slate-300/68 hover:text-slate-100"
        onClick={onNewShell}
      >
        <span className="text-lg leading-none">+</span>
        <span>New Terminal</span>
      </button>
    </div>
  );
}
