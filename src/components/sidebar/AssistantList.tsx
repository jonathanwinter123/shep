import type { TerminalTab } from "../../lib/types";
import AssistantButton from "./AssistantButton";

interface AssistantListProps {
  assistantTabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
}

export default function AssistantList({
  assistantTabs,
  activeTabId,
  onSelectTab,
}: AssistantListProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {assistantTabs.map((tab) => (
        <AssistantButton
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => onSelectTab(tab.id)}
        />
      ))}
    </div>
  );
}
