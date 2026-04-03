import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GitBranch, Zap, ChevronDown } from "lucide-react";
import { handleActionKey } from "../../lib/a11y";

interface BranchEntry {
  name: string;
  isWorktree: boolean;
  isActive: boolean;
  workspaceId: string | null;
}

interface GitIndicators {
  dirty: boolean;
  changeCount: number;
  ahead: number;
  behind: number;
}

interface WorkspaceListProps {
  branches: BranchEntry[];
  gitIndicators: GitIndicators | null;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCheckoutBranch: (branch: string) => void;
  onOpenGitPanel?: () => void;
}

export default function WorkspaceList({
  branches,
  gitIndicators,
  onSwitchWorkspace,
  onCheckoutBranch,
  onOpenGitPanel,
}: WorkspaceListProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const activeBranch = branches.find((b) => b.isActive);
  const activeLabel = activeBranch?.name ?? "main";

  // Position the menu below the trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.right, // right-aligned: left edge of menu = right edge of trigger
      width: Math.max(rect.width, 240),
    });
  }, [open]);

  // Close on outside click
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

  if (branches.length <= 1) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="workspace-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Branch: ${activeLabel}`}
      >
        {activeBranch?.isWorktree ? (
          <Zap size={10} className="workspace-list__icon workspace-list__icon--instant" />
        ) : (
          <GitBranch size={12} className="workspace-list__icon" />
        )}
        <span className="workspace-dropdown__label">{activeLabel}</span>
        {gitIndicators?.dirty && (
          <span
            className="badge workspace-dropdown__git-link"
            onClick={(e) => { e.stopPropagation(); onOpenGitPanel?.(); }}
            title="View changes"
          >
            {gitIndicators.changeCount}
          </span>
        )}
        {(gitIndicators?.ahead ?? 0) > 0 || (gitIndicators?.behind ?? 0) > 0 ? (
          <span
            className="badge workspace-dropdown__git-link"
            onClick={(e) => { e.stopPropagation(); onOpenGitPanel?.(); }}
            title="View changes"
          >
            {gitIndicators!.ahead > 0 && `↑${gitIndicators!.ahead}`}
            {gitIndicators!.ahead > 0 && gitIndicators!.behind > 0 && " "}
            {gitIndicators!.behind > 0 && `↓${gitIndicators!.behind}`}
          </span>
        ) : null}
        <span style={{ flex: 1 }} />
        {gitIndicators?.dirty && (
          <span
            className="workspace-dropdown__dirty-dot workspace-dropdown__git-link"
            onClick={(e) => { e.stopPropagation(); onOpenGitPanel?.(); }}
            title="View changes"
          />
        )}
        <ChevronDown size={12} style={{ opacity: 0.4, transition: "transform 160ms", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="workspace-dropdown__menu"
          style={{ top: menuPos.top, right: window.innerWidth - menuPos.left, width: menuPos.width }}
        >
          {branches.map((branch) => {
            const handleClick = () => {
              if (branch.isActive) {
                setOpen(false);
                return;
              }
              if (branch.workspaceId) {
                onSwitchWorkspace(branch.workspaceId);
              } else {
                onCheckoutBranch(branch.name);
              }
              setOpen(false);
            };

            return (
              <div
                key={branch.name}
                className={`workspace-dropdown__item ${branch.isActive ? "workspace-dropdown__item--active" : ""}`}
                onClick={handleClick}
                onKeyDown={(event) => handleActionKey(event, handleClick)}
                role="button"
                tabIndex={0}
                aria-label={`Switch to ${branch.name}`}
              >
                {branch.isWorktree ? (
                  <Zap size={10} className="workspace-list__icon workspace-list__icon--instant" />
                ) : (
                  <GitBranch size={12} className="workspace-list__icon" />
                )}
                <span className="workspace-dropdown__item-label">{branch.name}</span>
                {branch.isActive && <span className="workspace-list__active-dot" />}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
