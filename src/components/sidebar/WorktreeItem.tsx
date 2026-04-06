import { GitFork } from "lucide-react";
import { handleActionKey } from "../../lib/a11y";

interface WorktreeItemProps {
  branch: string;
  worktreePath: string;
  isExpanded: boolean;
  activity?: { terminalCount: number; hasAttention: boolean; hasCrash: boolean };
  onClick: () => void;
}

export default function WorktreeItem({
  branch,
  worktreePath,
  isExpanded,
  activity,
  onClick,
}: WorktreeItemProps) {
  const hasActivity = activity && activity.terminalCount > 0;
  const dotColor = activity?.hasCrash
    ? "var(--status-crashed)"
    : activity?.hasAttention
      ? "var(--status-attention)"
      : "var(--status-running)";

  return (
    <div
      className={`list-item ${isExpanded ? "project-active" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => handleActionKey(event, onClick)}
      title={worktreePath}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`Worktree branch ${branch}`}
    >
      <GitFork size={14} style={{ opacity: 0.6 }} />
      <span className="truncate font-medium">{branch}</span>
      <span className="flex-1" />
      {!isExpanded && hasActivity && (
        <span className="sidebar-status-dot" style={{ background: dotColor }} />
      )}
    </div>
  );
}
