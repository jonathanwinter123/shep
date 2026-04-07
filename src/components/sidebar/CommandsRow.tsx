import { Terminal } from "lucide-react";
import { useUIStore } from "../../stores/useUIStore";

interface CommandsRowProps {
  badge?: string | null;
}

export default function CommandsRow({ badge }: CommandsRowProps) {
  const commandsPanelActive = useUIStore((s) => s.commandsPanelActive);
  const { toggleCommandsPanel } = useUIStore.getState();

  return (
    <button
      onClick={toggleCommandsPanel}
      className={`section-toggle ${commandsPanelActive ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
    >
      <span className="shrink-0 w-[14px] flex items-center justify-center" style={{ color: "var(--section-icon-color)" }}>
        <Terminal size={14} />
      </span>
      <span className="truncate">Commands</span>
      {badge && (
        <span className="badge">{badge}</span>
      )}
    </button>
  );
}
