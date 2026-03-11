import type { TerminalTab } from "../../lib/types";
import TerminalItem from "./TerminalItem";

interface TerminalListProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
}

export default function TerminalList({
  tabs,
  activeTabId,
  onSelectTab,
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
    </div>
  );
}
