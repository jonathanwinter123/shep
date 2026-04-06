import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Check, Plus, GitFork } from "lucide-react";
import { gitListBranches, gitSwitchBranch, gitCreateBranch, gitListWorktrees } from "../../lib/tauri";
import { useGitStore } from "../../stores/useGitStore";

interface BranchDropdownProps {
  repoPath: string;
  currentBranch: string;
  isWorktree: boolean;
  onBranchChanged: () => void;
}

export default function BranchDropdown({
  repoPath,
  currentBranch,
  isWorktree,
  onBranchChanged,
}: BranchDropdownProps) {
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [worktreeMap, setWorktreeMap] = useState<Map<string, string>>(new Map());
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fetchBranches = useCallback(() => {
    gitListBranches(repoPath)
      .then(setBranches)
      .catch(() => setBranches([]));
    gitListWorktrees(repoPath)
      .then((wts) => {
        const map = new Map<string, string>();
        for (const wt of wts) {
          if (!wt.is_main && wt.branch) map.set(wt.branch, wt.path);
        }
        setWorktreeMap(map);
      })
      .catch(() => setWorktreeMap(new Map()));
  }, [repoPath]);

  const handleSwitch = useCallback(
    async (branch: string) => {
      if (branch === currentBranch) {
        setOpen(false);
        return;
      }
      setSwitching(true);
      setError(null);
      try {
        await gitSwitchBranch(repoPath, branch);
        await refreshStatus(repoPath);
        onBranchChanged();
        setOpen(false);
      } catch (e) {
        setError(String(e));
      } finally {
        setSwitching(false);
      }
    },
    [repoPath, currentBranch, refreshStatus, onBranchChanged],
  );

  const handleCreate = useCallback(async () => {
    const name = newBranchName.trim();
    if (!name) return;
    setSwitching(true);
    setError(null);
    try {
      await gitCreateBranch(repoPath, name);
      await refreshStatus(repoPath);
      onBranchChanged();
      setOpen(false);
      setCreating(false);
      setNewBranchName("");
    } catch (e) {
      setError(String(e));
    } finally {
      setSwitching(false);
    }
  }, [repoPath, newBranchName, refreshStatus, onBranchChanged]);

  const handleClick = useCallback(
    (branch: string) => {
      // Can't switch to a branch checked out in a worktree
      if (worktreeMap.has(branch)) return;
      handleSwitch(branch);
    },
    [worktreeMap, handleSwitch],
  );

  // Worktree sessions: branch is locked, show read-only
  if (isWorktree) {
    return (
      <span className="branch-tag" title="Branch is locked in worktree sessions">
        {currentBranch}
      </span>
    );
  }

  return (
    <div className="branch-dropdown" ref={ref}>
      <button
        className="branch-dropdown__trigger"
        onClick={() => {
          if (!open) fetchBranches();
          setOpen(!open);
          setCreating(false);
          setError(null);
        }}
      >
        <span>{currentBranch}</span>
        <ChevronDown
          size={12}
          style={{
            transition: "transform 150ms ease",
            transform: open ? "rotate(180deg)" : undefined,
            opacity: 0.5,
          }}
        />
      </button>

      {open && (
        <div className="branch-dropdown__menu">
          {error && (
            <div className="branch-dropdown__error">{error}</div>
          )}

          <div className="branch-dropdown__list">
            {branches.map((b) => {
              const isWorktreeBranch = worktreeMap?.has(b) ?? false;
              return (
                <button
                  key={b}
                  className={`list-item branch-dropdown__item${b === currentBranch ? " active" : ""}`}
                  disabled={switching}
                  onClick={() => handleClick(b)}
                >
                  <span style={{ flex: 1, textAlign: "left" }}>{b}</span>
                  {isWorktreeBranch && (
                    <GitFork size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
                  )}
                  {b === currentBranch && (
                    <Check size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="branch-dropdown__footer">
            {creating ? (
              <form
                className="branch-dropdown__create-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
              >
                <input
                  ref={inputRef}
                  className="branch-dropdown__input"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="new-branch-name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  disabled={switching}
                />
                <button
                  type="submit"
                  className="icon-btn"
                  disabled={switching || !newBranchName.trim()}
                  title="Create branch"
                >
                  <Check size={13} />
                </button>
              </form>
            ) : (
              <button
                className="list-item branch-dropdown__item"
                onClick={() => setCreating(true)}
              >
                <Plus size={13} style={{ opacity: 0.5 }} />
                <span>New branch</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
