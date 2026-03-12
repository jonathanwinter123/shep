import type { TerminalTab } from "../../lib/types";
import TerminalItem from "./TerminalItem";

interface TerminalListProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export default function TerminalList({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: TerminalListProps) {
  return (
    <>
      {tabs.map((tab) => (
        <div key={tab.id} className="tree-node">
          <TerminalItem
            tab={tab}
            isActive={tab.id === activeTabId}
            onClick={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
          />
        </div>
      ))}
    </>
  );
}
