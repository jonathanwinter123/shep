import type { ReactNode } from "react";
import { GitBranch, GitFork } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";
import type { TabActivity } from "../../lib/types";

interface WorktreeInfo {
  id: string;
  label: string;
  tabs: { ptyId: number }[];
}

interface WorkspaceRowProps {
  worktrees: WorktreeInfo[];
  activeWorkspaceId: string;
  currentBranch: string;
  onSwitchWorkspace: (workspaceId: string) => void;
  activeContent?: ReactNode;
}

function workspaceActivityDot(
  tabs: { ptyId: number }[],
  tabActivity: Record<number, TabActivity>,
): "active" | "crash" | "idle" {
  let hasActive = false;
  for (const tab of tabs) {
    const a = tabActivity[tab.ptyId];
    if (!a) continue;
    if (!a.alive && a.exitCode !== 0) return "crash";
    if (a.active && a.alive) hasActive = true;
  }
  return hasActive ? "active" : "idle";
}

const DOT_CLASS: Record<string, string> = {
  active: "sidebar-status-dot--active",
  crash: "sidebar-status-dot--exited",
  idle: "",
};

export default function WorkspaceRow({
  worktrees,
  activeWorkspaceId,
  currentBranch,
  onSwitchWorkspace,
  activeContent,
}: WorkspaceRowProps) {
  const tabActivity = useTerminalStore((s) => s.tabActivity);

  if (worktrees.length === 0) return null;

  return (
    <div className="tree-branch mt-0.5">
      {worktrees.map((wt) => {
        const isMain = wt.id === "main";
        const isActive = wt.id === activeWorkspaceId;
        const status = workspaceActivityDot(wt.tabs, tabActivity);

        return (
          <div key={wt.id} className="tree-node">
            <button
              className={`section-toggle ${isActive ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
              onClick={() => onSwitchWorkspace(wt.id)}
              aria-pressed={isActive}
              title={isMain ? `Current branch: ${currentBranch || "main"}` : `Worktree: ${wt.label}`}
            >
              <span
                className="shrink-0 w-[14px] flex items-center justify-center"
                style={{ color: isMain ? "var(--text-muted)" : "var(--section-icon-color, #c084fc)" }}
              >
                {isMain ? <GitBranch size={14} /> : <GitFork size={14} />}
              </span>
              <span className="truncate" style={{ opacity: isMain ? 0.78 : 1 }}>
                {isMain ? (currentBranch || "main") : wt.label}
              </span>
              {wt.tabs.length > 0 && <span className="badge">{wt.tabs.length}</span>}
              <span style={{ flex: 1 }} />
              {status !== "idle" && (
                <span className={`sidebar-status-dot ${DOT_CLASS[status]}`} />
              )}
            </button>
            {isActive && activeContent ? (
              <div className="tree-branch mt-0.5">
                {activeContent}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
