import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Copy,
} from "lucide-react";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";
import type { FileEntry } from "../../lib/types";
import { openInEditor, revealInFinder } from "../../lib/tauri";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { getErrorMessage } from "../../lib/errors";
import { handleActionKey } from "../../lib/a11y";

interface FileTreeItemProps {
  entry: FileEntry;
  isExpanded: boolean;
  isPreviewActive: boolean;
  onClick: () => void;
}

export default function FileTreeItem({
  entry,
  isExpanded,
  isPreviewActive,
  onClick,
}: FileTreeItemProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const preferredEditor = useEditorStore((s) => s.settings.preferredEditor);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClose = useCallback(() => {
    setMenu(null);
  }, []);

  const targetPath = entry.is_dir
    ? entry.path
    : entry.path.substring(0, entry.path.lastIndexOf("/"));

  const menuItems: ContextMenuItem[] = [
    {
      label: "Open in Editor",
      icon: <File size={14} />,
      onClick: () => {
        openInEditor(targetPath, preferredEditor).catch((error) => {
          pushNotice({
            tone: "error",
            title: "Couldn't open in editor",
            message: getErrorMessage(error),
          });
        });
      },
    },
    {
      label: "Reveal in Finder",
      icon: <FolderOpen size={14} />,
      onClick: () => {
        revealInFinder(targetPath).catch((error) => {
          pushNotice({
            tone: "error",
            title: "Couldn't reveal in Finder",
            message: getErrorMessage(error),
          });
        });
      },
    },
    {
      label: "Copy Path",
      icon: <Copy size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(entry.path).then(
          () => {
            pushNotice({
              tone: "success",
              title: "Copied path",
              message: entry.path,
            });
          },
          (error) => {
            pushNotice({
              tone: "error",
              title: "Couldn't copy path",
              message: getErrorMessage(error),
            });
          },
        );
      },
    },
  ];

  return (
    <>
      <div
        className={`list-item ${isPreviewActive ? "active" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(event) => handleActionKey(event, onClick)}
        title={entry.path}
        role="button"
        tabIndex={0}
        style={{ paddingLeft: `${entry.depth * 12 + 4}px` }}
      >
        {entry.is_dir ? (
          <>
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            {isExpanded ? (
              <FolderOpen size={14} />
            ) : (
              <Folder size={14} />
            )}
          </>
        ) : (
          <>
            <span style={{ width: 12 }} />
            <File size={14} />
          </>
        )}
        <span className="truncate text-sm">{entry.name}</span>
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
