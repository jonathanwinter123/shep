import { useState, useEffect, useCallback, useMemo } from "react";
import { GitBranch, GitFork, Upload } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import {
  gitChangedFiles, gitFileDiff, gitStageFile, gitUnstageFile,
  gitStageAll, gitCommit, gitPushBranch,
} from "../../lib/tauri";
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

  const effectivePath = worktreePath ?? activeProjectPath;

  const mainGitStatus = useGitStore(
    (s) => activeProjectPath ? s.projectGitStatus[activeProjectPath] ?? null : null,
  );
  const gitStatus = useGitStore(
    (s) => effectivePath ? s.projectGitStatus[effectivePath] ?? null : null,
  );

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
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!effectivePath) return;
    try {
      const result = await gitChangedFiles(effectivePath);
      setFiles(result);
    } catch (error) {
      setFiles([]);
      pushNotice({ tone: "error", title: "Couldn't load changed files", message: getErrorMessage(error) });
    }
  }, [effectivePath, pushNotice]);

  const statusKey = gitStatus
    ? `${gitStatus.staged}:${gitStatus.unstaged}:${gitStatus.untracked}`
    : "";
  useEffect(() => { fetchFiles(); }, [fetchFiles, statusKey]);

  useEffect(() => {
    setSelectedPath(null);
    setSelectedArea(null);
    setDiffContent("");
  }, [worktreeBranch]);

  const refreshAfterChange = useCallback(async () => {
    if (!effectivePath) return;
    await fetchFiles();
    await refreshStatus(effectivePath);
  }, [effectivePath, fetchFiles, refreshStatus]);

  const handleSelect = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      setSelectedPath(file.path);
      setSelectedArea(file.area);
      try {
        const diff = await gitFileDiff(effectivePath, file.path, file.area === "staged");
        setDiffContent(diff);
      } catch (error) {
        setDiffContent("");
        pushNotice({ tone: "error", title: "Couldn't load diff", message: getErrorMessage(error) });
      }
    },
    [effectivePath, pushNotice],
  );

  const handleStage = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      try {
        await gitStageFile(effectivePath, file.path);
        await refreshAfterChange();
      } catch (error) {
        pushNotice({ tone: "error", title: `Couldn't stage ${file.path}`, message: getErrorMessage(error) });
      }
    },
    [effectivePath, refreshAfterChange, pushNotice],
  );

  const handleUnstage = useCallback(
    async (file: ChangedFile) => {
      if (!effectivePath) return;
      try {
        await gitUnstageFile(effectivePath, file.path);
        await refreshAfterChange();
      } catch (error) {
        pushNotice({ tone: "error", title: `Couldn't unstage ${file.path}`, message: getErrorMessage(error) });
      }
    },
    [effectivePath, refreshAfterChange, pushNotice],
  );

  const handleStageAll = useCallback(async () => {
    if (!effectivePath) return;
    try {
      await gitStageAll(effectivePath);
      await refreshAfterChange();
    } catch (error) {
      pushNotice({ tone: "error", title: "Couldn't stage all", message: getErrorMessage(error) });
    }
  }, [effectivePath, refreshAfterChange, pushNotice]);

  const handleUnstageAll = useCallback(async () => {
    if (!effectivePath) return;
    // Unstage each staged file
    const staged = files.filter((f) => f.area === "staged");
    try {
      for (const f of staged) await gitUnstageFile(effectivePath, f.path);
      await refreshAfterChange();
    } catch (error) {
      pushNotice({ tone: "error", title: "Couldn't unstage all", message: getErrorMessage(error) });
    }
  }, [effectivePath, files, refreshAfterChange, pushNotice]);

  const handleCommit = useCallback(async () => {
    if (!effectivePath || !commitMsg.trim() || committing) return;
    setCommitting(true);
    try {
      await gitCommit(effectivePath, commitMsg.trim());
      setCommitMsg("");
      setSelectedPath(null);
      setSelectedArea(null);
      setDiffContent("");
      await refreshAfterChange();
    } catch (error) {
      pushNotice({ tone: "error", title: "Commit failed", message: getErrorMessage(error) });
    } finally {
      setCommitting(false);
    }
  }, [effectivePath, commitMsg, committing, refreshAfterChange, pushNotice]);

  const currentBranch = worktreeBranch ?? mainGitStatus?.branch ?? "";
  const handlePush = useCallback(async () => {
    if (!effectivePath || !currentBranch || pushing) return;
    setPushing(true);
    try {
      await gitPushBranch(effectivePath, currentBranch);
      await refreshStatus(effectivePath);
      pushNotice({ tone: "success", title: "Pushed", message: `${currentBranch} → origin` });
    } catch (error) {
      pushNotice({ tone: "error", title: "Push failed", message: getErrorMessage(error) });
    } finally {
      setPushing(false);
    }
  }, [effectivePath, currentBranch, pushing, refreshStatus, pushNotice]);

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

  if (worktreeBranch && !worktreePath) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Loading worktree…
      </div>
    );
  }

  const activeStatus = gitStatus ?? mainGitStatus;
  const stagedCount = files.filter((f) => f.area === "staged").length;
  const canCommit = stagedCount > 0 && commitMsg.trim().length > 0 && !committing;
  const showPush = activeStatus.ahead > 0;

  return (
    <div className="git-panel">
      <div className="git-panel__header">
        {worktreeBranch ? (
          <>
            <GitFork size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span className="git-panel__worktree-label">{worktreeBranch}</span>
          </>
        ) : (
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
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            backgroundColor: activeStatus.dirty ? "rgb(251, 191, 36)" : "rgb(74, 222, 128)",
          }}
        />
        {showPush && (
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "2px 8px", gap: 4, marginLeft: 4 }}
            onClick={handlePush}
            disabled={pushing}
            title={`Push ${activeStatus.ahead} commit${activeStatus.ahead > 1 ? "s" : ""} to origin`}
          >
            <Upload size={11} />
            {pushing ? "Pushing…" : `Push ↑${activeStatus.ahead}`}
          </button>
        )}
        {!worktreeBranch && !showPush && (mainGitStatus.behind > 0) && (
          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4, flexShrink: 0 }}>
            ↓{mainGitStatus.behind}
          </span>
        )}
      </div>
      <div className="git-panel__body">
        <div className="git-panel__sidebar">
          <FileList
            files={files}
            selectedPath={selectedPath}
            selectedArea={selectedArea}
            onSelect={handleSelect}
            onStage={handleStage}
            onUnstage={handleUnstage}
            onStageAll={handleStageAll}
            onUnstageAll={handleUnstageAll}
          />
          {/* Commit area — always visible at the bottom of the file list */}
          <div className="git-panel__commit">
            <textarea
              className="git-panel__commit-input"
              placeholder="Commit message"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
                  e.preventDefault();
                  handleCommit();
                }
              }}
              rows={2}
            />
            <button
              className="btn-primary git-panel__commit-btn"
              disabled={!canCommit}
              onClick={handleCommit}
            >
              {committing ? "Committing…" : `Commit${stagedCount > 0 ? ` (${stagedCount})` : ""}`}
            </button>
          </div>
        </div>
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
