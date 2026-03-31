import { useState, useEffect, useCallback, useMemo } from "react";
import { GitBranch, GitFork, X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { gitChangedFiles, gitFileDiff, gitStageFile, gitUnstageFile, gitListWorktrees, watchRepo, unwatchRepo } from "../../lib/tauri";
import type { ChangedFile, WorktreeEntry } from "../../lib/types";
import FileList from "./FileList";
import DiffViewer from "./DiffViewer";
import BranchDropdown from "./BranchDropdown";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { getErrorMessage } from "../../lib/errors";

export default function GitPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const projectGitStatus = useGitStore((s) => s.projectGitStatus);
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const pushNotice = useNoticeStore((s) => s.pushNotice);

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
    } catch (error) {
      setWorktreeEntries([]);
      pushNotice({
        tone: "error",
        title: "Couldn’t load worktrees",
        message: getErrorMessage(error),
      });
    }
  }, [activeProjectPath, pushNotice]);

  // Fetch worktrees on mount and when git status changes (catches new/removed worktrees)
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

  // Clear viewing path if the worktree it pointed to no longer exists
  const validViewingPath =
    viewingPath && worktreeEntries.some((w) => w.path === viewingPath)
      ? viewingPath
      : null;

  // Label for the currently-viewed worktree branch
  const viewingBranch = useMemo(() => {
    if (!validViewingPath) return null;
    const entry = worktreeEntries.find((w) => w.path === validViewingPath);
    return entry?.branch ?? null;
  }, [validViewingPath, worktreeEntries]);

  // Effective path: worktree path when viewing one, otherwise main repo
  const effectivePath = validViewingPath ?? activeProjectPath;

  // Git status for the effective path
  const gitStatus = effectivePath ? projectGitStatus[effectivePath] : null;

  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>("");

  const handleSetViewingPath = useCallback((path: string | null) => {
    setViewingPath(path);
    setSelectedPath(null);
    setSelectedArea(null);
    setDiffContent("");
  }, []);

  // Watch the viewed worktree for file changes (not covered by AppShell watcher)
  useEffect(() => {
    if (!validViewingPath) return;
    void watchRepo(validViewingPath);
    refreshStatus(validViewingPath);

    const unlisten = listen<{ paths: string[] }>("git-fs-changed", (event) => {
      if (event.payload.paths.includes(validViewingPath)) {
        refreshStatus(validViewingPath);
      }
    });

    return () => {
      void unwatchRepo(validViewingPath);
      unlisten.then((f) => f());
    };
  }, [validViewingPath, refreshStatus]);

  const fetchFiles = useCallback(async () => {
    if (!effectivePath) return;
    try {
      const result = await gitChangedFiles(effectivePath);
      setFiles(result);
    } catch (error) {
      setFiles([]);
      pushNotice({
        tone: "error",
        title: "Couldn’t load changed files",
        message: getErrorMessage(error),
      });
    }
  }, [effectivePath, pushNotice]);

  // Fetch file list when effective path or git status changes
  const statusKey = gitStatus
    ? `${gitStatus.staged}:${gitStatus.unstaged}:${gitStatus.untracked}`
    : "";
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, statusKey]);

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
      } catch (error) {
        setDiffContent("");
        pushNotice({
          tone: "error",
          title: "Couldn’t load diff",
          message: getErrorMessage(error),
        });
      }
    },
    [effectivePath, pushNotice],
  );

  const handleStage = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      try {
        await gitStageFile(effectivePath, file.path);
        await fetchFiles();
        await refreshStatus(effectivePath);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: `Couldn’t stage ${file.path}`,
          message: getErrorMessage(error),
        });
      }
    },
    [effectivePath, fetchFiles, pushNotice, refreshStatus],
  );

  const handleUnstage = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      try {
        await gitUnstageFile(effectivePath, file.path);
        await fetchFiles();
        await refreshStatus(effectivePath);
      } catch (error) {
        pushNotice({
          tone: "error",
          title: `Couldn’t unstage ${file.path}`,
          message: getErrorMessage(error),
        });
      }
    },
    [effectivePath, fetchFiles, pushNotice, refreshStatus],
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
        {validViewingPath ? (
          /* Viewing a worktree — show branch name + back button */
          <>
            <GitFork size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span className="git-panel__worktree-label">
              {viewingBranch ?? validViewingPath.split("/").pop() ?? "Worktree"}
            </span>
            <button
              className="icon-btn git-panel__back-btn"
              onClick={() => handleSetViewingPath(null)}
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
              onViewWorktree={handleSetViewingPath}
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
        {!validViewingPath && (mainGitStatus.ahead > 0 || mainGitStatus.behind > 0) && (
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
