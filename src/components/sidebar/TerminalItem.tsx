import type { TerminalTab } from "../../lib/types";
import { Terminal, CircleSmall } from "lucide-react";

interface TerminalItemProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
}

export default function TerminalItem({
  tab,
  isActive,
  onClick,
}: TerminalItemProps) {
  return (
    <div
      className={`list-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <Terminal size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{tab.label}</span>
      <CircleSmall size={14} className="shrink-0" fill="var(--status-running)" stroke="none" />
    </div>
  );
}
