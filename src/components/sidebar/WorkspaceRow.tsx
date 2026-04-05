import { useState, useCallback, type ReactNode } from "react";
import { GitBranch, FolderTree, Trash2 } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";
import type { TabActivity } from "../../lib/types";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";

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
  onRemoveWorktree?: (workspaceId: string) => void;
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
  onRemoveWorktree,
  activeContent,
}: WorkspaceRowProps) {
  const tabActivity = useTerminalStore((s) => s.tabActivity);
  const [menu, setMenu] = useState<{ x: number; y: number; wsId: string } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, wsId: string) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, wsId });
  }, []);

  const handleCloseMenu = useCallback(() => setMenu(null), []);

  if (worktrees.length === 0) return null;

  const menuItems: ContextMenuItem[] = menu && menu.wsId !== "main" && onRemoveWorktree
    ? [
        {
          label: "Remove worktree",
          icon: <Trash2 size={14} />,
          danger: true,
          onClick: () => onRemoveWorktree(menu.wsId),
        },
      ]
    : [];

  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {worktrees.map((wt) => {
        const isMain = wt.id === "main";
        const isActive = wt.id === activeWorkspaceId;
        const status = workspaceActivityDot(wt.tabs, tabActivity);
        const label = isMain ? (currentBranch || "main") : wt.label;

        return (
          <div key={wt.id}>
            <button
              className={`list-item ${isActive ? "active" : ""}`}
              onClick={() => onSwitchWorkspace(wt.id)}
              onContextMenu={!isMain ? (e) => handleContextMenu(e, wt.id) : undefined}
              aria-pressed={isActive}
              title={isMain ? `Open git for ${label}` : `Switch to ${label} and open git`}
            >
              <span
                className="shrink-0 w-[14px] flex items-center justify-center"
                style={{ color: "var(--text-muted)" }}
              >
                {isMain ? <GitBranch size={14} /> : <FolderTree size={14} />}
              </span>
              <span className="truncate" style={{ opacity: isMain ? 0.78 : 1 }}>
                {label}
              </span>
              {wt.tabs.length > 0 && <span className="badge">{wt.tabs.length}</span>}
              <span style={{ flex: 1 }} />
              {status !== "idle" && (
                <span className={`sidebar-status-dot ${DOT_CLASS[status]}`} />
              )}
            </button>
            {isActive && activeContent ? (
              <div className="mt-0.5 pl-4">
                {activeContent}
              </div>
            ) : null}
          </div>
        );
      })}
      {menu && menuItems.length > 0 && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={handleCloseMenu} />
      )}
    </div>
  );
}
