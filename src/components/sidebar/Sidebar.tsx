import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import SectionHeader from "./SectionHeader";
import ProjectList from "./ProjectList";
import SidebarFooter from "./SidebarFooter";

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
  onCloseTab: (tabId: string) => void;
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
  onCloseTab,
  onNewShell,
  onStartCommand,
  onStopCommand,
  onFocusCommand,
}: SidebarProps) {
  return (
    <div className="w-72 shrink-0 flex flex-col h-full overflow-y-auto pr-4 mr-4 border-r border-white/8">
      <SectionHeader label="Projects" />
      <ProjectList
        repos={repos}
        activeRepoPath={activeRepoPath}
        tabs={tabs}
        activeTabId={activeTabId}
        commands={commands}
        onSelectRepo={onSelectRepo}
        onAddProject={onAddProject}
        onRemoveProject={onRemoveProject}
        onLaunchAssistant={onLaunchAssistant}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewShell={onNewShell}
        onStartCommand={onStartCommand}
        onStopCommand={onStopCommand}
        onFocusCommand={onFocusCommand}
      />

      <div className="flex-1" />
      <SidebarFooter />
    </div>
  );
}
