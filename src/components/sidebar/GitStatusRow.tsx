import { GitBranch } from "lucide-react";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";

interface GitStatusRowProps {
  repoPath: string;
}

export default function GitStatusRow({ repoPath }: GitStatusRowProps) {
  const status = useGitStore((s) => s.projectGitStatus[repoPath]);
  const gitPanelOpen = useUIStore((s) => s.gitPanelOpen);
  const toggleGitPanel = useUIStore((s) => s.toggleGitPanel);

  if (!status?.is_git_repo) return null;

  const changeCount = status.staged + status.unstaged + status.untracked;
  const hasRemoteDelta = status.ahead > 0 || status.behind > 0;

  return (
    <div className="mt-1">
      <button
        onClick={toggleGitPanel}
        className={`section-toggle ${gitPanelOpen ? "!text-[var(--text-primary)] !bg-white/6" : ""}`}
      >
        <GitBranch size={14} className="shrink-0" />
        <span className="truncate">{status.branch || "HEAD"}</span>
        {status.dirty && (
          <span className="badge">{changeCount}</span>
        )}
        {hasRemoteDelta && (
          <span className="badge">
            {status.ahead > 0 && `↑${status.ahead}`}
            {status.ahead > 0 && status.behind > 0 && " "}
            {status.behind > 0 && `↓${status.behind}`}
          </span>
        )}
      </button>
    </div>
  );
}
