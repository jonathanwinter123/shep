import type { TerminalTab, TabActivity } from "../../lib/types";
import { Terminal } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { handleActionKey } from "../../lib/a11y";

interface TerminalItemProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function dotClass(activity: TabActivity | undefined): string {
  if (!activity) return "sidebar-status-dot--idle";
  if (!activity.alive) return activity.exitCode === 0 ? "sidebar-status-dot--idle" : "sidebar-status-dot--exited";
  if (activity.active) return "sidebar-status-dot--active";
  return "sidebar-status-dot--idle";
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
      onKeyDown={(event) => handleActionKey(event, onClick)}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`Open terminal tab ${tab.label}`}
    >
      <Terminal size={14} className="shrink-0" />
      <span className="min-w-0 truncate text-left">{tab.label}</span>
      <span className={`sidebar-status-dot ${dotClass(activity)}`} />
      <button
        className="icon-btn sidebar-close-btn"
        aria-label={`Close terminal tab ${tab.label}`}
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
