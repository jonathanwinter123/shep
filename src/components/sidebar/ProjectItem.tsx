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
      className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] border transition-colors cursor-pointer ${
        isActive
          ? "border-white/14 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-transparent text-slate-300/72 hover:bg-white/6 hover:text-slate-100"
      } ${!repo.valid ? "opacity-50" : ""}`}
      onClick={onClick}
      title={repo.path}
    >
      <span className="truncate flex-1">{repo.name}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-sky-300 shrink-0" />
      )}
      <button
        className="text-slate-400/50 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
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
