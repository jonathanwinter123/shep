import type { RepoInfo } from "../../lib/types";

interface ProjectItemProps {
  repo: RepoInfo;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export default function ProjectItem({
  repo,
  isActive,
  onClick,
  onRemove,
}: ProjectItemProps) {
  return (
    <div
      className={`group w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
        isActive
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
      } ${!repo.valid ? "opacity-50" : ""}`}
      onClick={onClick}
      title={repo.path}
    >
      <span className="truncate flex-1">{repo.name}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
      )}
      <button
        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove project"
      >
        ×
      </button>
    </div>
  );
}
