import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FolderGit, Zap, ChevronDown } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { handleActionKey } from "../../lib/a11y";

interface WorkspacePickerProps {
  repoPath: string;
  onSwitch: (workspaceId: string) => void;
}

export default function WorkspacePicker({ repoPath, onSwitch }: WorkspacePickerProps) {
  const ps = useTerminalStore((s) => s.projectState[repoPath]);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const activeWorkspaceId = ps?.activeWorkspaceId ?? "main";

  const workspaces = useMemo(() => {
    if (!ps) return [];
    return Object.entries(ps.workspaces).map(([id, ws]) => ({
      id,
      label: ws.label,
    }));
  }, [ps]);

  const activeLabel = workspaces.find((w) => w.id === activeWorkspaceId)?.label ?? "main";

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (workspaces.length <= 1) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="workspace-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Workspace: ${activeLabel}`}
        title="Switch workspace"
      >
        <FolderGit size={12} className="workspace-list__icon" />
        <span className="workspace-dropdown__label">{activeLabel}</span>
        <ChevronDown size={12} style={{ opacity: 0.4, transition: "transform 160ms", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="workspace-dropdown__menu"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className={`workspace-dropdown__item ${ws.id === activeWorkspaceId ? "workspace-dropdown__item--active" : ""}`}
              onClick={() => { onSwitch(ws.id); setOpen(false); }}
              onKeyDown={(event) => handleActionKey(event, () => { onSwitch(ws.id); setOpen(false); })}
              role="button"
              tabIndex={0}
              aria-label={`Switch to workspace ${ws.label}`}
            >
              {ws.id === "main" ? (
                <FolderGit size={12} className="workspace-list__icon" />
              ) : (
                <Zap size={10} className="workspace-list__icon workspace-list__icon--instant" />
              )}
              <span className="workspace-dropdown__item-label">{ws.label}</span>
              {ws.id === activeWorkspaceId && <span className="workspace-list__active-dot" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
