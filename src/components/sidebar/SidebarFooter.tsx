import { ChartNoAxesCombined, Radio } from "lucide-react";
import { useUIStore } from "../../stores/useUIStore";
import GearIcon from "./icons/GearIcon";

export default function SidebarFooter() {
  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen);
  const usageTabOpen = useUIStore((s) => s.usageTabOpen);
  const portsPanelOpen = useUIStore((s) => s.portsPanelOpen);
  const { toggleSettings, toggleUsagePanel, togglePortsPanel } = useUIStore.getState();
  const footerButtonClass = "tab !flex-1 !shrink !justify-center !gap-0.5 !px-2 !py-1.5 flex-col min-w-0";

  return (
    <div className="border-t border-[var(--glass-border)] px-2 pt-2 pb-1.5">
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
          onClick={togglePortsPanel}
          className={`${footerButtonClass} ${portsPanelOpen ? "active" : ""}`}
          aria-label="Open ports"
        >
          <Radio size={18} />
          <span className="text-[10px]">Ports</span>
        </button>
      </div>
    </div>
  );
}
