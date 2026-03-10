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
    <div className="flex flex-col gap-0.5">
      {tabs.map((tab) => (
        <TerminalItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => onSelectTab(tab.id)}
        />
      ))}
      <button className="list-item w-full" onClick={onNewShell}>
        <span>+</span>
        <span>New Terminal</span>
      </button>
    </div>
  );
}
