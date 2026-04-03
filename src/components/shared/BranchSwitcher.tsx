import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useGitStore } from "../../stores/useGitStore";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { gitListBranches, gitSwitchBranch } from "../../lib/tauri";
import { getErrorMessage } from "../../lib/errors";
import { GitBranch, ChevronDown } from "lucide-react";
import { handleActionKey } from "../../lib/a11y";

interface BranchSwitcherProps {
  repoPath: string;
  onOpenGitPanel?: () => void;
}

export default function BranchSwitcher({ repoPath, onOpenGitPanel }: BranchSwitcherProps) {
  const gitStatus = useGitStore((s) => s.projectGitStatus[repoPath]);
  const pushNotice = useNoticeStore((s) => s.pushNotice);
  const [allBranches, setAllBranches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0, width: 0 });

  const statusKey = gitStatus?.branch ?? "";
  useEffect(() => {
    gitListBranches(repoPath).then(setAllBranches).catch(() => setAllBranches([]));
  }, [repoPath, statusKey]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
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

  const currentGitBranch = gitStatus?.branch ?? "main";

  const handleCheckoutBranch = useCallback(async (branch: string) => {
    try {
      await gitSwitchBranch(repoPath, branch);
      useGitStore.getState().refreshStatus(repoPath);
    } catch (error) {
      pushNotice({
        tone: "error",
        title: "Branch switch failed",
        message: getErrorMessage(error),
      });
    }
  }, [repoPath, pushNotice]);

  if (!gitStatus?.is_git_repo) return null;

  const dirty = gitStatus.dirty;
  const changeCount = gitStatus.staged + gitStatus.unstaged + gitStatus.untracked;
  const hasRemoteDelta = gitStatus.ahead > 0 || gitStatus.behind > 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="workspace-dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Branch: ${currentGitBranch}`}
        title="Switch branch"
      >
        <GitBranch size={12} className="workspace-list__icon" />
        <span className="workspace-dropdown__label">{currentGitBranch}</span>
        {dirty && (
          <span
            className="badge workspace-dropdown__git-link"
            onClick={(e) => { e.stopPropagation(); onOpenGitPanel?.(); }}
            title="View changes"
          >
            {changeCount}
          </span>
        )}
        {hasRemoteDelta && (
          <span
            className="badge workspace-dropdown__git-link"
            onClick={(e) => { e.stopPropagation(); onOpenGitPanel?.(); }}
            title="View changes"
          >
            {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
            {gitStatus.ahead > 0 && gitStatus.behind > 0 && " "}
            {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {dirty && (
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
          style={{ top: menuPos.top, right: menuPos.right, width: menuPos.width }}
        >
          {allBranches.map((branch) => (
            <div
              key={branch}
              className={`workspace-dropdown__item ${branch === currentGitBranch ? "workspace-dropdown__item--active" : ""}`}
              onClick={() => {
                if (branch !== currentGitBranch) handleCheckoutBranch(branch);
                setOpen(false);
              }}
              onKeyDown={(event) => handleActionKey(event, () => {
                if (branch !== currentGitBranch) handleCheckoutBranch(branch);
                setOpen(false);
              })}
              role="button"
              tabIndex={0}
              aria-label={`Switch to branch ${branch}`}
            >
              <GitBranch size={12} className="workspace-list__icon" />
              <span className="workspace-dropdown__item-label">{branch}</span>
              {branch === currentGitBranch && <span className="workspace-list__active-dot" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
