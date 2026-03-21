import { CodeXml, ChartNoAxesCombined } from "lucide-react";
import { useUIStore } from "../../stores/useUIStore";
import GearIcon from "./icons/GearIcon";

interface SidebarFooterProps {
  activeRepoPath: string | null;
  onOpenInEditor: (repoPath: string) => void;
}

export default function SidebarFooter({
  activeRepoPath,
  onOpenInEditor,
}: SidebarFooterProps) {
  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen);
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const usageTabOpen = useUIStore((s) => s.usageTabOpen);
  const toggleUsagePanel = useUIStore((s) => s.toggleUsagePanel);
  const editorDisabled = !activeRepoPath;
  const footerButtonClass = "tab !flex-1 !shrink !justify-center !gap-0.5 !px-2 !py-1.5 flex-col min-w-0";

  return (
    <div className="border-t border-white/8 px-2 pt-2 pb-1.5">
      <div className="flex items-stretch gap-1">
        <button
          onClick={toggleSettings}
          className={`${footerButtonClass} ${settingsTabOpen ? "active" : ""}`}
          aria-label="Open settings"
        >
          <GearIcon size={20} />
          <span className="text-[10px]">Settings</span>
        </button>
        <button
          onClick={toggleUsagePanel}
          className={`${footerButtonClass} ${usageTabOpen ? "active" : ""}`}
          aria-label="Open usage"
        >
          <ChartNoAxesCombined size={18} />
          <span className="text-[10px]">Usage</span>
        </button>
        <button
          onClick={() => {
            if (activeRepoPath) {
              onOpenInEditor(activeRepoPath);
            }
          }}
          disabled={editorDisabled}
          className={`${footerButtonClass} ${
            editorDisabled ? "opacity-40 cursor-default hover:!bg-transparent hover:!text-[var(--text-secondary)]" : ""
          }`}
          title="IDE"
          aria-label={editorDisabled ? "Open project in IDE unavailable" : "Open active project in IDE"}
        >
          <CodeXml size={20} />
          <span className="text-[10px]">IDE</span>
        </button>
      </div>
    </div>
  );
}
