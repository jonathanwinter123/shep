import type { TerminalTab } from "../../lib/types";
import { assistantLogoSrc } from "../../lib/assistantLogos";

interface AssistantButtonProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
}

export default function AssistantButton({
  tab,
  isActive,
  onClick,
}: AssistantButtonProps) {
  const logoUrl = tab.assistantId ? assistantLogoSrc[tab.assistantId] : null;

  return (
    <div
      className={`list-item w-full ${isActive ? "active" : ""}`}
      onClick={onClick}
      title={tab.label}
      role="button"
    >
      {logoUrl && <img src={logoUrl} alt="" width={14} height={14} />}
      <span className="truncate flex-1 text-left">{tab.label}</span>
    </div>
  );
}
