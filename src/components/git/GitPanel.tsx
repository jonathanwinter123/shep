import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { GitBranch } from "lucide-react";

export default function GitPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const projectGitStatus = useGitStore((s) => s.projectGitStatus);
  const gitStatus = activeProjectPath ? projectGitStatus[activeProjectPath] : null;

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
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch size={16} />
        <span className="text-lg font-medium">{gitStatus.branch}</span>
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: gitStatus.dirty
              ? "rgb(251, 191, 36)"
              : "rgb(74, 222, 128)",
          }}
        />
        {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
          <span className="text-xs opacity-50 ml-2">
            {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
            {gitStatus.ahead > 0 && gitStatus.behind > 0 && " "}
            {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 opacity-50">
        {gitStatus.staged > 0 && (
          <p>{gitStatus.staged} staged {gitStatus.staged === 1 ? "change" : "changes"}</p>
        )}
        {gitStatus.unstaged > 0 && (
          <p>{gitStatus.unstaged} unstaged {gitStatus.unstaged === 1 ? "change" : "changes"}</p>
        )}
        {gitStatus.untracked > 0 && (
          <p>{gitStatus.untracked} untracked {gitStatus.untracked === 1 ? "file" : "files"}</p>
        )}
        {!gitStatus.dirty && (
          <p>Working tree clean</p>
        )}
      </div>
    </div>
  );
}
