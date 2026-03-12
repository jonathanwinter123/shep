import type { TerminalTab, TabActivity } from "../../lib/types";
import { assistantLogoSrc } from "../../lib/assistantLogos";
import { useTerminalStore } from "../../stores/useTerminalStore";

interface AssistantButtonProps {
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
      title={tab.label}
      role="button"
    >
      {logoUrl && <img src={logoUrl} alt="" width={14} height={14} />}
      <span className="truncate text-left">{tab.label}</span>
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
