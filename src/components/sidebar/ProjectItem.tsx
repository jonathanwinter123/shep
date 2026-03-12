import { useState, useCallback } from "react";
import type { RepoInfo } from "../../lib/types";
import { getEditorLabel } from "../../lib/editors";
import { useEditorStore } from "../../stores/useEditorStore";
import {
  Folder,
  FolderOpen,
  FolderOpen as FolderOpenIcon,
  Copy,
  Trash2,
  SquareArrowOutUpRight,
} from "lucide-react";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";

interface ProjectItemProps {
  repo: RepoInfo;
  isActive: boolean;
  isExpanded: boolean;
  activity?: { terminalCount: number; runningCount: number; hasAttention: boolean; hasCrash: boolean };
  onClick: () => void;
  onRemove: () => void;
  onOpenInEditor: () => void;
}

export default function ProjectItem({
  repo,
  isActive,
  isExpanded,
  activity,
  onClick,
  onRemove,
  onOpenInEditor,
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
  const preferredEditorLabel = getEditorLabel(preferredEditor);
  const editorActionLabel = preferredEditorLabel
    ? `Open in ${preferredEditorLabel}`
    : "Set Editor Preference";

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
        // Use Tauri shell open
        import("@tauri-apps/plugin-shell").then((mod) => mod.open(repo.path));
      },
    },
    {
      label: "Copy Path",
      icon: <Copy size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(repo.path);
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

  return (
    <>
      <div
        className={`list-item ${isActive ? "project-active" : ""} ${!repo.valid ? "opacity-50" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        title={repo.path}
      >
        {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        <span className="truncate flex-1 font-medium">{repo.name}</span>
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
    </>
  );
}
