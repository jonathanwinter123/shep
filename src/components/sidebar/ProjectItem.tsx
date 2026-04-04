import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { RepoInfo, TabActivity } from "../../lib/types";
import { getEditorLabel } from "../../lib/editors";
import { useEditorStore } from "../../stores/useEditorStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import {
  Folder,
  FolderOpen,
  FolderOpen as FolderOpenIcon,
  Copy,
  Trash2,
  SquareArrowOutUpRight,
  GitFork,
} from "lucide-react";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { getErrorMessage } from "../../lib/errors";
import { handleActionKey } from "../../lib/a11y";

interface WorktreeInfo {
  id: string;
  label: string;
  tabs: { ptyId: number }[];
}

interface ProjectItemProps {
  repo: RepoInfo;
  isActive: boolean;
  isExpanded: boolean;
  activity?: { terminalCount: number; runningCount: number; hasAttention: boolean; hasCrash: boolean };
  worktrees: WorktreeInfo[];
  activeWorkspaceId: string;
  onClick: () => void;
  onRemove: () => void;
  onOpenInEditor: () => void;
  onSwitchWorkspace: (workspaceId: string) => void;
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

function aggregateWorktreeActivity(
  worktrees: WorktreeInfo[],
  tabActivity: Record<number, TabActivity>,
): "active" | "crash" | "idle" {
  let hasActive = false;
  for (const wt of worktrees) {
    const status = workspaceActivityDot(wt.tabs, tabActivity);
    if (status === "crash") return "crash";
    if (status === "active") hasActive = true;
  }
  return hasActive ? "active" : "idle";
}

const DOT_CLASS: Record<string, string> = {
  active: "sidebar-status-dot--active",
  crash: "sidebar-status-dot--exited",
  idle: "",
};

export default function ProjectItem({
  repo,
  isActive,
  isExpanded,
  activity,
  worktrees,
  activeWorkspaceId,
  onClick,
  onRemove,
  onOpenInEditor,
  onSwitchWorkspace,
}: ProjectItemProps) {
  const hasActivity = activity && (activity.terminalCount > 0 || activity.runningCount > 0);
  const dotColor = activity?.hasCrash
    ? "var(--status-crashed)"
    : activity?.hasAttention
      ? "var(--status-attention)"
      : "var(--status-running)";
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const preferredEditor = useEditorStore((s) => s.settings.preferredEditor);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const preferredEditorLabel = getEditorLabel(preferredEditor);
  const editorActionLabel = preferredEditorLabel
    ? `Open in ${preferredEditorLabel}`
    : "Set Editor Preference";

  // Worktree badge dropdown
  const [wtOpen, setWtOpen] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const wtMenuRef = useRef<HTMLDivElement>(null);
  const [wtMenuPos, setWtMenuPos] = useState({ top: 0, left: 0 });

  const tabActivity = useTerminalStore((s) => s.tabActivity);
  const worktreeStatus = aggregateWorktreeActivity(worktrees, tabActivity);

  useEffect(() => {
    if (!wtOpen) return;
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setWtMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    const handle = (e: MouseEvent) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
        wtMenuRef.current && !wtMenuRef.current.contains(e.target as Node)
      ) {
        setWtOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [wtOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setConfirmRemove(false);
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClose = useCallback(() => {
    setMenu(null);
    setConfirmRemove(false);
  }, []);

  const menuItems: ContextMenuItem[] = [
    {
      label: editorActionLabel,
      icon: <SquareArrowOutUpRight size={14} />,
      onClick: onOpenInEditor,
    },
    {
      label: "Open in Finder",
      icon: <FolderOpenIcon size={14} />,
      onClick: () => {
        import("@tauri-apps/plugin-shell").then((mod) => mod.open(repo.path));
      },
    },
    {
      label: "Copy Path",
      icon: <Copy size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(repo.path)
          .then(() => {
            pushNotice({
              tone: "success",
              title: "Copied project path",
              message: repo.path,
            });
          })
          .catch((error) => {
            pushNotice({
              tone: "error",
              title: "Couldn't copy project path",
              message: getErrorMessage(error),
            });
          });
      },
    },
    {
      label: confirmRemove ? "Click to confirm" : "Remove Project",
      icon: <Trash2 size={14} />,
      danger: true,
      keepOpen: !confirmRemove,
      onClick: () => {
        if (confirmRemove) {
          onRemove();
        } else {
          setConfirmRemove(true);
        }
      },
    },
  ];

  const hasWorktrees = worktrees.length > 0;
  const inWorktree = activeWorkspaceId !== "main";

  return (
    <>
      <div
        className={`list-item ${isActive ? "project-active" : ""} ${!repo.valid ? "opacity-50" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(event) => handleActionKey(event, onClick)}
        title={repo.path}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${repo.name}${repo.valid ? "" : " unavailable"}`}
      >
        {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        <span className="truncate font-medium">{repo.name}</span>
        {hasWorktrees && (
          <button
            ref={badgeRef}
            className={`worktree-badge ${inWorktree ? "worktree-badge--in-worktree" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setWtOpen((v) => !v);
            }}
            title={inWorktree ? `In worktree: ${activeWorkspaceId}` : `${worktrees.length} worktree${worktrees.length > 1 ? "s" : ""}`}
            aria-label="Switch workspace"
          >
            <span>worktree</span>
            <span>{worktrees.length}</span>
            {worktreeStatus !== "idle" && (
              <span className={`sidebar-status-dot sidebar-status-dot--sm ${DOT_CLASS[worktreeStatus]}`} />
            )}
          </button>
        )}
        <span className="flex-1" />
        {!isExpanded && hasActivity && (
          <span className="sidebar-status-dot" style={{ background: dotColor }} />
        )}
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={handleClose}
        />
      )}
      {wtOpen && createPortal(
        <div
          ref={wtMenuRef}
          className="workspace-dropdown__menu"
          style={{ top: wtMenuPos.top, left: wtMenuPos.left, minWidth: 200 }}
        >
          {/* Base project */}
          <div
            className={`workspace-dropdown__item ${activeWorkspaceId === "main" ? "workspace-dropdown__item--active" : ""}`}
            onClick={() => { onSwitchWorkspace("main"); setWtOpen(false); }}
            onKeyDown={(event) => handleActionKey(event, () => { onSwitchWorkspace("main"); setWtOpen(false); })}
            role="button"
            tabIndex={0}
          >
            <span className="workspace-dropdown__item-label">None</span>
            {activeWorkspaceId === "main" && <span className="workspace-list__active-dot" />}
          </div>
          {/* Worktrees */}
          {worktrees.map((wt) => {
            const status = workspaceActivityDot(wt.tabs, tabActivity);
            return (
              <div
                key={wt.id}
                className={`workspace-dropdown__item ${wt.id === activeWorkspaceId ? "workspace-dropdown__item--active" : ""}`}
                onClick={() => { onSwitchWorkspace(wt.id); setWtOpen(false); }}
                onKeyDown={(event) => handleActionKey(event, () => { onSwitchWorkspace(wt.id); setWtOpen(false); })}
                role="button"
                tabIndex={0}
              >
                <GitFork size={12} style={{ opacity: 0.5 }} />
                <span className="workspace-dropdown__item-label">{wt.label}</span>
                {status !== "idle" && (
                  <span className={`sidebar-status-dot ${DOT_CLASS[status]}`} />
                )}
                {wt.id === activeWorkspaceId && <span className="workspace-list__active-dot" />}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
