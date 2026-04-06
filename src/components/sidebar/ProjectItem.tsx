import { useState, useCallback, useEffect, useRef } from "react";
import type { RepoInfo, WorktreeEntry } from "../../lib/types";
import { getEditorLabel } from "../../lib/editors";
import { useEditorStore } from "../../stores/useEditorStore";
import {
  Folder,
  FolderOpen,
  FolderOpen as FolderOpenIcon,
  GitFork,
  Copy,
  Trash2,
  SquareArrowOutUpRight,
  Search,
} from "lucide-react";
import { createPortal } from "react-dom";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { getErrorMessage } from "../../lib/errors";
import { handleActionKey } from "../../lib/a11y";
import { gitListWorktrees } from "../../lib/tauri";

interface ProjectItemProps {
  repo: RepoInfo;
  isActive: boolean;
  isExpanded: boolean;
  activity?: { terminalCount: number; runningCount: number; hasAttention: boolean; hasCrash: boolean };
  worktreeParent?: string | null;
  existingPaths: Set<string>;
  onClick: () => void;
  onRemove: () => void;
  onOpenInEditor: () => void;
  onAddProject: (repoPath: string) => void;
}

export default function ProjectItem({
  repo,
  isActive,
  isExpanded,
  activity,
  worktreeParent,
  existingPaths,
  onClick,
  onRemove,
  onOpenInEditor,
  onAddProject,
}: ProjectItemProps) {
  const hasActivity = activity && (activity.terminalCount > 0 || activity.runningCount > 0);
  const dotColor = activity?.hasCrash
    ? "var(--status-crashed)"
    : activity?.hasAttention
      ? "var(--status-attention)"
      : "var(--status-running)";
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const preferredEditor = useEditorStore((s) => s.settings.preferredEditor);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const preferredEditorLabel = getEditorLabel(preferredEditor);
  const editorActionLabel = preferredEditorLabel
    ? `Open in ${preferredEditorLabel}`
    : "Set Editor Preference";

  // Worktree picker state
  const [wtPicker, setWtPicker] = useState<{ x: number; y: number } | null>(null);
  const [wtEntries, setWtEntries] = useState<WorktreeEntry[]>([]);
  const [wtSelected, setWtSelected] = useState<Set<string>>(new Set());
  const wtRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!wtPicker) return;
    const handle = (e: MouseEvent) => {
      if (wtRef.current && !wtRef.current.contains(e.target as Node)) {
        setWtPicker(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWtPicker(null);
    };
    document.addEventListener("mousedown", handle, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [wtPicker]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClose = useCallback(() => {
    setMenu(null);
  }, []);

  const handleDiscoverWorktrees = async () => {
    try {
      const worktrees = await gitListWorktrees(repo.path);
      const available = worktrees.filter(
        (wt) => !wt.is_main && wt.path && !existingPaths.has(wt.path),
      );
      if (available.length === 0) {
        pushNotice({ tone: "success", title: "No new worktrees found", message: repo.name });
        return;
      }
      setWtEntries(available);
      setWtSelected(new Set(available.map((wt) => wt.path)));
      // Position near the context menu
      setWtPicker(menu ?? { x: 200, y: 200 });
    } catch (error) {
      pushNotice({ tone: "error", title: "Couldn't discover worktrees", message: getErrorMessage(error) });
    }
  };

  const handleAddSelected = () => {
    for (const path of wtSelected) {
      onAddProject(path);
    }
    setWtPicker(null);
  };

  const menuItems: ContextMenuItem[] = [
    ...(!worktreeParent ? [{
      label: "Discover Worktrees",
      icon: <Search size={14} />,
      onClick: handleDiscoverWorktrees,
    }] : []),
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
      label: "Remove Project",
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: onRemove,
    },
  ];

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
        {worktreeParent ? (
          <GitFork size={14} className="shrink-0" style={{ opacity: 0.6 }} />
        ) : (
          isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />
        )}
        <span className="truncate font-medium">
          {worktreeParent ? `${worktreeParent} > ${repo.name}` : repo.name}
        </span>
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
      {wtPicker && createPortal(
        <div
          ref={wtRef}
          className="context-menu"
          style={{ left: wtPicker.x, top: wtPicker.y, minWidth: 220 }}
        >
          <div style={{ padding: "6px 10px", fontSize: 11, opacity: 0.5 }}>
            Select worktrees to add
          </div>
          {wtEntries.map((wt) => {
            const checked = wtSelected.has(wt.path);
            return (
              <button
                key={wt.path}
                className="context-menu__item"
                onClick={() => {
                  setWtSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(wt.path)) next.delete(wt.path);
                    else next.add(wt.path);
                    return next;
                  });
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  style={{ accentColor: "var(--text-muted)", pointerEvents: "none" }}
                />
                <GitFork size={12} style={{ opacity: 0.5 }} />
                <span>{wt.branch ?? wt.path}</span>
              </button>
            );
          })}
          <div style={{ padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              className="btn-primary"
              style={{ width: "100%", fontSize: 12, padding: "4px 0" }}
              disabled={wtSelected.size === 0}
              onClick={handleAddSelected}
            >
              Add{wtSelected.size > 0 ? ` (${wtSelected.size})` : ""}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
