import { Terminal } from "lucide-react";
import { useUIStore } from "../../stores/useUIStore";

interface CommandsRowProps {
  badge?: string | null;
}

export default function CommandsRow({ badge }: CommandsRowProps) {
  const commandsPanelOpen = useUIStore((s) => s.commandsPanelOpen);
  const toggleCommandsPanel = useUIStore((s) => s.toggleCommandsPanel);

  return (
    <button
      onClick={toggleCommandsPanel}
      className={`section-toggle ${commandsPanelOpen ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
    >
      <Terminal size={14} className="shrink-0" />
      <span className="truncate">Commands</span>
      {badge && (
        <span className="badge">{badge}</span>
      )}
    </button>
  );
}
