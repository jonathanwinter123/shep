import { GitBranch } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";

interface GitStatusRowProps {
  repoPath: string;
}

export default function GitStatusRow({ repoPath }: GitStatusRowProps) {
  const status = useGitStore((s) => s.projectGitStatus[repoPath]);
  const gitPanelActive = useUIStore((s) => s.gitPanelActive);
  const openGitPanel = useUIStore((s) => s.openGitPanel);

  if (!status?.is_git_repo) return null;

  const changeCount = status.staged + status.unstaged + status.untracked;
  const label = status.branch && status.branch !== "(detached)" ? status.branch : "Git";

  return (
    <button
      onClick={openGitPanel}
      className={`section-toggle ${gitPanelActive ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
    >
      <GitBranch size={14} className="shrink-0" style={{ color: "var(--section-icon-color)" }} />
      <span className="truncate" title={label}>{label}</span>
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
