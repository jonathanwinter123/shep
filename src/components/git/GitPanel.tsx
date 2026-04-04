import { useState, useEffect, useCallback, useMemo } from "react";
import { GitBranch, GitFork } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { gitChangedFiles, gitFileDiff, gitStageFile, gitUnstageFile } from "../../lib/tauri";
import type { ChangedFile } from "../../lib/types";
import FileList from "./FileList";
import DiffViewer from "./DiffViewer";
import BranchDropdown from "./BranchDropdown";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { getErrorMessage } from "../../lib/errors";

export default function GitPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const pushNotice = useNoticeStore((s) => s.pushNotice);

  // Active workspace branch name — null when on main workspace
  // Returns a primitive to avoid Zustand v5 re-render loops
  const worktreeBranch = useTerminalStore((s) => {
    const path = s.activeProjectPath;
    if (!path) return null;
    const ps = s.projectState[path];
    if (!ps) return null;
    const wsId = ps.activeWorkspaceId;
    return wsId === "main" ? null : wsId;
  });

  // Resolve branch → filesystem path via git store's cached worktree list
  const worktreePath = useGitStore((s) => {
    if (!worktreeBranch || !activeProjectPath) return null;
    const entries = s.worktreesByRepo[activeProjectPath];
    if (!entries) return null;
    return entries.find((e) => e.branch === worktreeBranch)?.path ?? null;
  });

  // Effective path for git commands: worktree path if in one, otherwise main repo
  const effectivePath = worktreePath ?? activeProjectPath;

  // Git status for main repo and effective path
  const mainGitStatus = useGitStore(
    (s) => activeProjectPath ? s.projectGitStatus[activeProjectPath] ?? null : null,
  );
  const gitStatus = useGitStore(
    (s) => effectivePath ? s.projectGitStatus[effectivePath] ?? null : null,
  );

  // Worktree entries for building BranchDropdown's worktree map
  // Selector returns stable array ref from store — safe for Zustand v5
  const worktreeEntries = useGitStore(
    (s) => activeProjectPath ? s.worktreesByRepo[activeProjectPath] : undefined,
  );
  const worktreeMap = useMemo(() => {
    if (!worktreeEntries || worktreeEntries.length <= 1) return undefined;
    const map = new Map<string, string>();
    for (const e of worktreeEntries) {
      if (!e.is_main && e.branch) map.set(e.branch, e.path);
    }
    return map.size > 0 ? map : undefined;
  }, [worktreeEntries]);

  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>("");

  const fetchFiles = useCallback(async () => {
    if (!effectivePath) return;
    try {
      const result = await gitChangedFiles(effectivePath);
      setFiles(result);
    } catch (error) {
      setFiles([]);
      pushNotice({
        tone: "error",
        title: "Couldn't load changed files",
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

  // Clear selection when switching workspaces
  useEffect(() => {
    setSelectedPath(null);
    setSelectedArea(null);
    setDiffContent("");
  }, [worktreeBranch]);

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
          title: "Couldn't load diff",
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
          title: `Couldn't stage ${file.path}`,
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
          title: `Couldn't unstage ${file.path}`,
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

  // Worktree branch selected but path not yet resolved (worktree list loading)
  if (worktreeBranch && !worktreePath) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Loading worktree…
      </div>
    );
  }

  return (
    <div className="git-panel">
      <div className="git-panel__header">
        {worktreeBranch ? (
          /* Worktree workspace — branch is locked, show read-only */
          <>
            <GitFork size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span className="git-panel__worktree-label">
              {worktreeBranch}
            </span>
          </>
        ) : (
          /* Main workspace — full branch dropdown */
          <>
            <GitBranch size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            <BranchDropdown
              repoPath={activeProjectPath}
              currentBranch={mainGitStatus.branch}
              isWorktree={false}
              onBranchChanged={handleBranchChanged}
              worktreeMap={worktreeMap}
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
        {!worktreeBranch && (mainGitStatus.ahead > 0 || mainGitStatus.behind > 0) && (
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
