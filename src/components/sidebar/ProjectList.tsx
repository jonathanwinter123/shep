import type { RepoInfo } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import ProjectItem from "./ProjectItem";

interface ProjectListProps {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  onSelectRepo: (repoPath: string) => void;
  onAddProject: (repoPath: string) => void;
  onRemoveProject: (repoPath: string) => void;
}

export default function ProjectList({
  repos,
  activeRepoPath,
  onSelectRepo,
  onAddProject,
  onRemoveProject,
}: ProjectListProps) {
  const handleAddClick = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select project folder",
    });
    if (selected) {
      onAddProject(selected);
    }
  };

  return (
    <div className="flex flex-col gap-0.5 px-1">
      {repos.map((repo) => (
        <ProjectItem
          key={repo.path}
          repo={repo}
          isActive={repo.path === activeRepoPath}
          onClick={() => onSelectRepo(repo.path)}
          onRemove={() => onRemoveProject(repo.path)}
        />
      ))}
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
        onClick={handleAddClick}
      >
        <span className="text-lg leading-none">+</span>
        <span>Add Project</span>
      </button>
    </div>
  );
}
