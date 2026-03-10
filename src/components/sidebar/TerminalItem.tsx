import type { TerminalTab } from "../../lib/types";

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
      className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] border transition-colors ${
        isActive
          ? "border-white/14 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-transparent text-slate-300/72 hover:bg-white/6 hover:text-slate-100"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      <button className="min-w-0 flex-1 truncate text-left" onClick={onClick}>
        {tab.label}
      </button>
      <button
        className="glass-button rounded-md px-1.5 py-0.5 text-slate-400/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
        onClick={onClose}
        title="Close tab"
      >
        ×
      </button>
    </div>
  );
}
