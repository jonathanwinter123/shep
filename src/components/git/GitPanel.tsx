import { useState, useEffect, useCallback } from "react";
import { GitBranch } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { gitChangedFiles, gitFileDiff, gitStageFile, gitUnstageFile } from "../../lib/tauri";
import type { ChangedFile } from "../../lib/types";
import FileList from "./FileList";
import DiffViewer from "./DiffViewer";
import BranchDropdown from "./BranchDropdown";

export default function GitPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const projectGitStatus = useGitStore((s) => s.projectGitStatus);
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const gitStatus = activeProjectPath ? projectGitStatus[activeProjectPath] : null;

  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>("");

  const fetchFiles = useCallback(async () => {
    if (!activeProjectPath) return;
    try {
      const result = await gitChangedFiles(activeProjectPath);
      setFiles(result);
    } catch {
      setFiles([]);
    }
  }, [activeProjectPath]);

  // Fetch file list on mount and when project changes
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
      if (!activeProjectPath) return;
      setSelectedPath(file.path);
      setSelectedArea(file.area);
      try {
        const diff = await gitFileDiff(
          activeProjectPath,
          file.path,
          file.area === "staged",
        );
        setDiffContent(diff);
      } catch {
        setDiffContent("");
      }
    },
    [activeProjectPath],
  );

  const handleStage = useCallback(
    async (file: ChangedFile) => {
      if (!activeProjectPath) return;
      try {
        await gitStageFile(activeProjectPath, file.path);
        await fetchFiles();
        await refreshStatus(activeProjectPath);
      } catch {
        // ignore
      }
    },
    [activeProjectPath, fetchFiles, refreshStatus],
  );

  const handleUnstage = useCallback(
    async (file: ChangedFile) => {
      if (!activeProjectPath) return;
      try {
        await gitUnstageFile(activeProjectPath, file.path);
        await fetchFiles();
        await refreshStatus(activeProjectPath);
      } catch {
        // ignore
      }
    },
    [activeProjectPath, fetchFiles, refreshStatus],
  );

  if (!activeProjectPath) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Select a project to view git status
      </div>
    );
  }

  if (!gitStatus?.is_git_repo) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Not a git repository
      </div>
    );
  }

  return (
    <div className="git-panel">
      <div className="git-panel__header">
        <GitBranch size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
        <BranchDropdown
          repoPath={activeProjectPath}
          currentBranch={gitStatus.branch}
          isWorktree={false}
          onBranchChanged={() => {
            fetchFiles();
            setSelectedPath(null);
            setSelectedArea(null);
            setDiffContent("");
          }}
        />
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor: gitStatus.dirty
              ? "rgb(251, 191, 36)"
              : "rgb(74, 222, 128)",
          }}
        />
        {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4, flexShrink: 0 }}>
            {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
            {gitStatus.ahead > 0 && gitStatus.behind > 0 && " "}
            {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
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
