import { useUIStore } from "../../stores/useUIStore";
import { GitBranch } from "lucide-react";
import GearIcon from "./icons/GearIcon";

export default function SidebarFooter() {
  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen);
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const gitPanelOpen = useUIStore((s) => s.gitPanelOpen);
  const toggleGitPanel = useUIStore((s) => s.toggleGitPanel);

  return (
    <div className="flex items-center gap-3 px-2 py-1.5 border-t border-white/8">
      <button
        onClick={toggleGitPanel}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md cursor-pointer border-none bg-transparent transition-colors hover:bg-white/8 ${gitPanelOpen ? "!bg-white/10 text-white" : "text-white/50"}`}
      >
        <GitBranch size={24} />
        <span className="text-[10px]">Git</span>
      </button>
      <button
        onClick={toggleSettings}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md cursor-pointer border-none bg-transparent transition-colors hover:bg-white/8 ${settingsTabOpen ? "!bg-white/10 text-white" : "text-white/50"}`}
      >
        <GearIcon size={24} />
        <span className="text-[10px]">Settings</span>
      </button>
    </div>
  );
}
