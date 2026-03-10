import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import ProjectItem from "./ProjectItem";
import SectionHeader from "./SectionHeader";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import CommandList from "./CommandList";

interface ProjectListProps {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  tabs: TerminalTab[];
  activeTabId: string | null;
  commands: CommandState[];
  onSelectRepo: (repoPath: string) => void;
  onAddProject: (repoPath: string) => void;
  onRemoveProject: (repoPath: string) => void;
  onLaunchAssistant: (assistantId: string) => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewShell: () => void;
  onStartCommand: (name: string) => void;
  onStopCommand: (name: string) => void;
  onFocusCommand: (name: string) => void;
}

export default function ProjectList({
  repos,
  activeRepoPath,
  tabs,
  activeTabId,
  commands,
  onSelectRepo,
  onAddProject,
  onRemoveProject,
  onLaunchAssistant,
  onSelectTab,
  onCloseTab,
  onNewShell,
  onStartCommand,
  onStopCommand,
  onFocusCommand,
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
    <div className="flex flex-col gap-1 px-2 pb-2">
      {repos.map((repo) => (
        <div key={repo.path}>
          <ProjectItem
            repo={repo}
            isActive={repo.path === activeRepoPath}
            onClick={() => onSelectRepo(repo.path)}
            onRemove={() => onRemoveProject(repo.path)}
          />
          {repo.path === activeRepoPath && (
            <div className="mx-1 mt-2 border-t border-white/8 px-1 pb-2">
              <SectionHeader label="Coding Assistants" />
              <AssistantList onLaunch={onLaunchAssistant} />

              <SectionHeader label="Terminals" />
              <TerminalList
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={onSelectTab}
                onCloseTab={onCloseTab}
                onNewShell={onNewShell}
              />

              <SectionHeader label="Commands" />
              <CommandList
                commands={commands}
                onStart={onStartCommand}
                onStop={onStopCommand}
                onFocus={onFocusCommand}
              />
            </div>
          )}
        </div>
      ))}
      <button
        className="glass-button w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-slate-300/68 hover:text-slate-100"
        onClick={handleAddClick}
      >
        <span className="text-lg leading-none">+</span>
        <span>Add Project</span>
      </button>
    </div>
  );
}
