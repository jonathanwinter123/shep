import { useUIStore } from "../../stores/useUIStore";
import GearIcon from "./icons/GearIcon";

export default function SidebarFooter() {
  const username = useUIStore((s) => s.username);
  const computerName = useUIStore((s) => s.computerName);
  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen);
  const toggleSettings = useUIStore((s) => s.toggleSettings);

  const initial = username ? username[0].toUpperCase() : "?";

  return (
    <div className="flex items-center gap-3 px-3 py-3 border-t border-white/8">
      <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-white/10 text-white/80 font-medium" style={{ fontSize: "var(--text-label)" }}>
        {initial}
      </div>

      <span className="truncate flex-1" style={{ color: "var(--text-secondary)" }}>
        {computerName || username || ""}
      </span>

      <button
        onClick={toggleSettings}
        title="Settings"
        className={`icon-btn ${settingsTabOpen ? "!bg-white/10 !text-white" : ""}`}
      >
        <GearIcon size={16} />
      </button>
    </div>
  );
}
