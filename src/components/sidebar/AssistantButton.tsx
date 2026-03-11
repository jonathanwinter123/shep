import type { TerminalTab } from "../../lib/types";
import { assistantLogoSrc } from "../../lib/assistantLogos";

interface AssistantButtonProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export default function AssistantButton({
  tab,
  isActive,
  onClick,
  onClose,
}: AssistantButtonProps) {
  const logoUrl = tab.assistantId ? assistantLogoSrc[tab.assistantId] : null;

  return (
    <div
      className={`list-item sidebar-closable w-full ${isActive ? "active" : ""}`}
      onClick={onClick}
      title={tab.label}
      role="button"
    >
      {logoUrl && <img src={logoUrl} alt="" width={14} height={14} />}
      <span className="truncate text-left">{tab.label}</span>
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
