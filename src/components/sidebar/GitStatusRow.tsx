import { GitCommitHorizontal } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";

interface GitStatusRowProps {
  repoPath: string;
}

export default function GitStatusRow({ repoPath }: GitStatusRowProps) {
  const status = useGitStore((s) => s.projectGitStatus[repoPath]);
  const gitPanelActive = useUIStore((s) => s.gitPanelActive);
  const toggleGitPanel = useUIStore((s) => s.toggleGitPanel);

  if (!status?.is_git_repo) return null;

  const changeCount = status.staged + status.unstaged + status.untracked;

  return (
    <button
      onClick={toggleGitPanel}
      className={`section-toggle ${gitPanelActive ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
    >
      <GitCommitHorizontal size={14} className="shrink-0" style={{ color: "var(--section-icon-color)" }} />
      <span className="truncate">Git</span>
      {changeCount > 0 && (
        <span className="badge">{changeCount}</span>
      )}
      {(status.ahead > 0 || status.behind > 0) && (
        <span className="badge">
          {status.ahead > 0 && `↑${status.ahead}`}
          {status.ahead > 0 && status.behind > 0 && " "}
          {status.behind > 0 && `↓${status.behind}`}
        </span>
      )}
      {status.dirty && <span className="sidebar-status-dot sidebar-status-dot--attention" />}
    </button>
  );
}
