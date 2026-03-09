import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import SectionHeader from "./SectionHeader";
import ProjectList from "./ProjectList";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import CommandList from "./CommandList";

interface SidebarProps {
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
  onNewShell: () => void;
  onStartCommand: (name: string) => void;
  onStopCommand: (name: string) => void;
  onFocusCommand: (name: string) => void;
}

export default function Sidebar({
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
  onNewShell,
  onStartCommand,
  onStopCommand,
  onFocusCommand,
}: SidebarProps) {
  return (
    <div className="w-56 bg-gray-800/50 border-r border-white/5 flex flex-col h-full overflow-y-auto">
      <SectionHeader label="Projects" />
      <ProjectList
        repos={repos}
        activeRepoPath={activeRepoPath}
        onSelectRepo={onSelectRepo}
        onAddProject={onAddProject}
        onRemoveProject={onRemoveProject}
      />

      {activeRepoPath && (
        <div className="ml-2 border-l border-white/5">
          <SectionHeader label="Coding Assistants" />
          <AssistantList onLaunch={onLaunchAssistant} />

          <SectionHeader label="Terminals" />
          <TerminalList
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={onSelectTab}
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

      <div className="flex-1" />
    </div>
  );
}
