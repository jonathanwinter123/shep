import type { TerminalTab } from "../../lib/types";
import AssistantButton from "./AssistantButton";

interface AssistantListProps {
  assistantTabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export default function AssistantList({
  assistantTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: AssistantListProps) {
  return (
    <>
      {assistantTabs.map((tab) => (
        <div key={tab.id}>
          <AssistantButton
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
