import { useCallback } from "react";
import type { TerminalTab } from "../../lib/types";
import { GitBranch, RefreshCw } from "lucide-react";
import { gitCurrentBranch } from "../../lib/tauri";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { assistantLogoSrc } from "../../lib/assistantLogos";

interface AssistantButtonProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
}

export default function AssistantButton({
  tab,
  isActive,
  onClick,
}: AssistantButtonProps) {
  const logoUrl = tab.assistantId ? assistantLogoSrc[tab.assistantId] : null;
  const updateTab = useTerminalStore((s) => s.updateTab);

  const handleRefreshBranch = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const cwd = tab.worktreePath ?? tab.repoPath;
      const branch = await gitCurrentBranch(cwd).catch(() => null);
      updateTab(tab.id, { branch });
    },
    [tab.id, tab.worktreePath, tab.repoPath, updateTab],
  );

  return (
    <div>
      <div
        className={`list-item w-full ${isActive ? "active" : ""}`}
        onClick={onClick}
        title={tab.label}
        role="button"
      >
        {logoUrl && <img src={logoUrl} alt="" width={14} height={14} />}
        <span className="truncate flex-1 text-left">{tab.label}</span>
      </div>
      {isActive && tab.branch !== null && (
        <div className="assistant-item flex items-center gap-2 pl-9 mt-0.5 min-w-0">
          <GitBranch size={12} className="shrink-0 opacity-40" />
          <span className="branch-tag truncate">{tab.branch}</span>
          <div
            className="assistant-item__refresh icon-btn shrink-0"
            style={{ padding: 2 }}
            onClick={handleRefreshBranch}
            title="Refresh branch"
            role="button"
          >
            <RefreshCw size={10} />
          </div>
        </div>
      )}
    </div>
  );
}
