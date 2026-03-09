import type { TerminalTab } from "../../lib/types";

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
    <button
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-left transition-colors ${
        isActive
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
      }`}
      onClick={onClick}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
      <span className="truncate">{tab.label}</span>
    </button>
  );
}
