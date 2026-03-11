import type { TerminalTab } from "../../lib/types";
import { Terminal } from "lucide-react";

interface TerminalItemProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export default function TerminalItem({
  tab,
  isActive,
  onClick,
  onClose,
}: TerminalItemProps) {
  return (
    <div
      className={`list-item sidebar-closable ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <Terminal size={14} className="shrink-0" />
      <span className="min-w-0 truncate text-left">{tab.label}</span>
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
