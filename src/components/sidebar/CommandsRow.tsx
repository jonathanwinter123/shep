import { useTerminalStore } from "../../stores/useTerminalStore";
import { panelTabId } from "../../lib/types";
import tabKindMeta from "../../lib/tabKindMeta";

interface CommandsRowProps {
  badge?: string | null;
}

export default function CommandsRow({ badge }: CommandsRowProps) {
  const isActive = useTerminalStore((s) => {
    const path = s.activeProjectPath;
    if (!path) return false;
    return s.projectState[path]?.activeTabId === panelTabId("commands");
  });

  return (
    <button
      onClick={() => useTerminalStore.getState().togglePanelTab("commands")}
      className={`section-toggle ${isActive ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
    >
      <span className="shrink-0 w-[14px] flex items-center justify-center" style={{ color: "var(--section-icon-color)" }}>
        {tabKindMeta.commands.icon(14)}
      </span>
      <span className="truncate">Commands</span>
      {badge && (
        <span className="badge">{badge}</span>
      )}
    </button>
  );
}
