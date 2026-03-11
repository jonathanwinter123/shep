import { useState, useEffect, useCallback, useMemo } from "react";
import { GitBranch, GitFork, X } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { gitChangedFiles, gitFileDiff, gitStageFile, gitUnstageFile, gitListWorktrees } from "../../lib/tauri";
import type { ChangedFile, WorktreeEntry } from "../../lib/types";
import FileList from "./FileList";
import DiffViewer from "./DiffViewer";
import BranchDropdown from "./BranchDropdown";

export default function GitPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const projectGitStatus = useGitStore((s) => s.projectGitStatus);
  const refreshStatus = useGitStore((s) => s.refreshStatus);

  // Worktree viewing state: null = main repo, string = worktree path
  const [viewingPath, setViewingPath] = useState<string | null>(null);

  // Worktrees fetched from git
  const [worktreeEntries, setWorktreeEntries] = useState<WorktreeEntry[]>([]);

  // Main repo git status
  const mainGitStatus = activeProjectPath ? projectGitStatus[activeProjectPath] : null;

  // Fetch worktrees from git
  const fetchWorktrees = useCallback(async () => {
    if (!activeProjectPath) {
      setWorktreeEntries([]);
      return;
    }
    try {
      const entries = await gitListWorktrees(activeProjectPath);
      setWorktreeEntries(entries);
    } catch {
      setWorktreeEntries([]);
    }
  }, [activeProjectPath]);

  useEffect(() => {
    fetchWorktrees();
  }, [fetchWorktrees]);

  // Re-fetch worktrees when any git status changes (catches new/removed worktrees)
  const allStatusKeys = useMemo(() => {
    return Object.keys(projectGitStatus).sort().join(",");
  }, [projectGitStatus]);
  useEffect(() => {
    fetchWorktrees();
  }, [allStatusKeys, fetchWorktrees]);

  // Map of branch name → worktree path (excludes main worktree)
  const worktreeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of worktreeEntries) {
      if (!entry.is_main && entry.branch) {
        map.set(entry.branch, entry.path);
      }
    }
    return map;
  }, [worktreeEntries]);

  // Label for the currently-viewed worktree branch
  const viewingBranch = useMemo(() => {
    if (!viewingPath) return null;
    const entry = worktreeEntries.find((w) => w.path === viewingPath);
    return entry?.branch ?? null;
  }, [viewingPath, worktreeEntries]);

  // Effective path: worktree path when viewing one, otherwise main repo
  const effectivePath = viewingPath ?? activeProjectPath;

  // Git status for the effective path
  const gitStatus = effectivePath ? projectGitStatus[effectivePath] : null;

  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>("");

  // Poll git status for the viewed worktree (not covered by AppShell polling)
  useEffect(() => {
    if (!viewingPath) return;
    refreshStatus(viewingPath);
    const id = setInterval(() => refreshStatus(viewingPath), 5_000);
    return () => clearInterval(id);
  }, [viewingPath, refreshStatus]);

  // Reset viewing state if the viewed worktree disappears
  useEffect(() => {
    if (viewingPath && !worktreeEntries.some((w) => w.path === viewingPath)) {
      setViewingPath(null);
    }
  }, [viewingPath, worktreeEntries]);

  // Reset selection when switching between main repo and worktree
  useEffect(() => {
    setSelectedPath(null);
    setSelectedArea(null);
    setDiffContent("");
  }, [viewingPath]);

  const fetchFiles = useCallback(async () => {
    if (!effectivePath) return;
    try {
      const result = await gitChangedFiles(effectivePath);
      setFiles(result);
    } catch {
      setFiles([]);
    }
  }, [effectivePath]);

  // Fetch file list on mount and when effective path changes
  useEffect(() => {
    fetchFiles();
    setSelectedPath(null);
    setSelectedArea(null);
    setDiffContent("");
  }, [fetchFiles]);

  // Re-fetch when git status counts change (from polling)
  const statusKey = gitStatus
    ? `${gitStatus.staged}:${gitStatus.unstaged}:${gitStatus.untracked}`
    : "";
  useEffect(() => {
    if (statusKey) fetchFiles();
  }, [statusKey, fetchFiles]);

  const handleSelect = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      setSelectedPath(file.path);
      setSelectedArea(file.area);
      try {
        const diff = await gitFileDiff(
          effectivePath,
          file.path,
          file.area === "staged",
        );
        setDiffContent(diff);
      } catch {
        setDiffContent("");
      }
    },
    [effectivePath],
  );

  const handleStage = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      try {
        await gitStageFile(effectivePath, file.path);
        await fetchFiles();
        await refreshStatus(effectivePath);
      } catch {
        // ignore
      }
    },
    [effectivePath, fetchFiles, refreshStatus],
  );

  const handleUnstage = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      try {
        await gitUnstageFile(effectivePath, file.path);
        await fetchFiles();
        await refreshStatus(effectivePath);
      } catch {
        // ignore
      }
    },
    [effectivePath, fetchFiles, refreshStatus],
  );

  const handleBranchChanged = useCallback(() => {
    fetchFiles();
    setSelectedPath(null);
    setSelectedArea(null);
    setDiffContent("");
  }, [fetchFiles]);

  if (!activeProjectPath) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Select a project to view git status
      </div>
    );
  }

  if (!mainGitStatus?.is_git_repo) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Not a git repository
      </div>
    );
  }

  return (
    <div className="git-panel">
      <div className="git-panel__header">
        {viewingPath ? (
          /* Viewing a worktree — show branch name + back button */
          <>
            <GitFork size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span className="git-panel__worktree-label">
              {viewingBranch ?? viewingPath.split("/").pop() ?? "Worktree"}
            </span>
            <button
              className="icon-btn git-panel__back-btn"
              onClick={() => setViewingPath(null)}
              title="Back to main repo"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          /* Normal view — branch dropdown */
          <>
            <GitBranch size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            <BranchDropdown
              repoPath={activeProjectPath}
              currentBranch={mainGitStatus.branch}
              isWorktree={false}
              onBranchChanged={handleBranchChanged}
              worktreeMap={worktreeMap.size > 0 ? worktreeMap : undefined}
              onViewWorktree={setViewingPath}
            />
          </>
        )}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor:
              (gitStatus ?? mainGitStatus).dirty
                ? "rgb(251, 191, 36)"
                : "rgb(74, 222, 128)",
          }}
        />
        {!viewingPath && (mainGitStatus.ahead > 0 || mainGitStatus.behind > 0) && (
          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4, flexShrink: 0 }}>
            {mainGitStatus.ahead > 0 && `↑${mainGitStatus.ahead}`}
            {mainGitStatus.ahead > 0 && mainGitStatus.behind > 0 && " "}
            {mainGitStatus.behind > 0 && `↓${mainGitStatus.behind}`}
          </span>
        )}
      </div>
      <div className="git-panel__body">
        <FileList
          files={files}
          selectedPath={selectedPath}
          selectedArea={selectedArea}
          onSelect={handleSelect}
          onStage={handleStage}
          onUnstage={handleUnstage}
        />
        {selectedPath ? (
          <DiffViewer diff={diffContent} filePath={selectedPath} />
        ) : (
          <div className="git-panel__diff">
            <div style={{ padding: 24, opacity: 0.35, fontSize: 12 }}>
              Select a file to view diff
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
