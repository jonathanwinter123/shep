import type { TerminalTabData } from "../../lib/types";
import TerminalItem from "./TerminalItem";

interface TerminalListProps {
  tabs: TerminalTabData[];
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
        <div key={tab.id}>
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
