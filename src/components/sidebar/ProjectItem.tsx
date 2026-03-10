import type { RepoInfo } from "../../lib/types";
import { Folder, FolderOpen, CircleSmall } from "lucide-react";

interface ProjectItemProps {
  repo: RepoInfo;
  isActive: boolean;
  isExpanded: boolean;
  activity?: { terminalCount: number; runningCount: number };
  onClick: () => void;
}

export default function ProjectItem({
  repo,
  isActive,
  isExpanded,
  activity,
  onClick,
}: ProjectItemProps) {
  const hasActivity = activity && (activity.terminalCount > 0 || activity.runningCount > 0);

  return (
    <div
      className={`list-item ${isActive ? "active" : ""} ${!repo.valid ? "opacity-50" : ""}`}
      onClick={onClick}
      title={repo.path}
    >
      {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
      <span className="truncate flex-1 font-medium">{repo.name}</span>
      {!isExpanded && hasActivity && (
        <CircleSmall size={14} className="shrink-0" fill="var(--status-running)" stroke="none" />
      )}
    </div>
  );
}
