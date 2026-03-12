import type { TerminalTab, TabActivity } from "../../lib/types";
import { Terminal } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";

interface TerminalItemProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function dotClass(activity: TabActivity | undefined): string {
  if (!activity) return "tab-status-dot--idle";
  if (!activity.alive) return activity.exitCode === 0 ? "tab-status-dot--idle" : "tab-status-dot--exited";
  if (activity.active) return "tab-status-dot--active";
  return "tab-status-dot--idle";
}

export default function TerminalItem({
  tab,
  isActive,
  onClick,
  onClose,
}: TerminalItemProps) {
  const activity: TabActivity | undefined = useTerminalStore((s) => s.tabActivity[tab.ptyId]);

  return (
    <div
      className={`list-item sidebar-closable ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <Terminal size={14} className="shrink-0" />
      <span className="min-w-0 truncate text-left">{tab.label}</span>
      <span className={`tab-status-dot ${dotClass(activity)}`} />
      <button
        className="icon-btn sidebar-close-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </div>
  );
}
