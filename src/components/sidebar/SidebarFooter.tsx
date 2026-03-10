import { useUIStore } from "../../stores/useUIStore";
import GearIcon from "./icons/GearIcon";

export default function SidebarFooter() {
  const username = useUIStore((s) => s.username);
  const computerName = useUIStore((s) => s.computerName);
  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen);
  const toggleSettings = useUIStore((s) => s.toggleSettings);

  const initial = username ? username[0].toUpperCase() : "?";

  return (
    <div className="flex items-center gap-3 px-2 py-3 border-t border-white/8">
      <div
        className="flex items-center justify-center shrink-0 rounded-full bg-white/10 text-white/80 text-xs font-medium"
        style={{ width: 28, height: 28 }}
      >
        {initial}
      </div>

      <span className="text-sm text-slate-300/80 truncate flex-1">
        {computerName || username || ""}
      </span>

      <button
        onClick={toggleSettings}
        title="Settings"
        className={`glass-button rounded-md p-1.5 transition-colors ${
          settingsTabOpen
            ? "text-white bg-white/10"
            : "text-slate-400/70 hover:text-white"
        }`}
      >
        <GearIcon size={16} />
      </button>
    </div>
  );
}
