import type { TerminalTab, TabActivity } from "../../lib/types";
import { assistantLogoSrc } from "../../lib/assistantLogos";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { handleActionKey } from "../../lib/a11y";

interface AssistantButtonProps {
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

export default function AssistantButton({
  tab,
  isActive,
  onClick,
  onClose,
}: AssistantButtonProps) {
  const logoUrl = tab.assistantId ? assistantLogoSrc[tab.assistantId] : null;
  const activity: TabActivity | undefined = useTerminalStore((s) => s.tabActivity[tab.ptyId]);

  return (
    <div
      className={`list-item sidebar-closable w-full ${isActive ? "active" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => handleActionKey(event, onClick)}
      title={tab.label}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`Open assistant tab ${tab.label}`}
    >
      {logoUrl && <img src={logoUrl} alt="" width={14} height={14} />}
      <span className="truncate text-left">{tab.label}</span>
      <span className={`sidebar-status-dot ${dotClass(activity)}`} />
      <button
        className="icon-btn sidebar-close-btn"
        aria-label={`Close assistant tab ${tab.label}`}
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
