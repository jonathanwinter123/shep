import { useState, useCallback } from "react";
import type { RepoInfo } from "../../lib/types";
import { Folder, FolderOpen, CircleSmall, FolderOpen as FolderOpenIcon, Copy, Trash2 } from "lucide-react";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";

interface ProjectItemProps {
  repo: RepoInfo;
  isActive: boolean;
  isExpanded: boolean;
  activity?: { terminalCount: number; runningCount: number };
  onClick: () => void;
  onRemove: () => void;
}

export default function ProjectItem({
  repo,
  isActive,
  isExpanded,
  activity,
  onClick,
  onRemove,
}: ProjectItemProps) {
  const hasActivity = activity && (activity.terminalCount > 0 || activity.runningCount > 0);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

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
        className={`list-item ${isActive ? "active" : ""} ${!repo.valid ? "opacity-50" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        title={repo.path}
      >
        {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        <span className="truncate flex-1 font-medium">{repo.name}</span>
        {!isExpanded && hasActivity && (
          <CircleSmall size={14} className="shrink-0" fill="var(--status-running)" stroke="none" />
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
