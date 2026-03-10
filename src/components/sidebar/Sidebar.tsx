import { useMemo } from "react";
import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useCommandStore } from "../../stores/useCommandStore";
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
  onLaunchAssistant,
  onSelectTab,
  onNewShell,
  onStartCommand,
  onStopCommand,
  onFocusCommand,
}: SidebarProps) {
  const projectState = useTerminalStore((s) => s.projectState);
  const projectCommands = useCommandStore((s) => s.projectCommands);

  const projectActivity = useMemo(() => {
    const activity: Record<string, { terminalCount: number; runningCount: number }> = {};
    for (const repo of repos) {
      const repoTabs = projectState[repo.path]?.tabs ?? [];
      const cmds = projectCommands[repo.path] ?? [];
      activity[repo.path] = {
        terminalCount: repoTabs.length,
        runningCount: cmds.filter((c) => c.status === "running").length,
      };
    }
    return activity;
  }, [repos, projectState, projectCommands]);

  return (
    <div className="w-72 shrink-0 flex flex-col h-full overflow-y-auto pr-4 mr-4 border-r border-white/8">
      <SectionHeader label="Projects" />
      <ProjectList
        repos={repos}
        activeRepoPath={activeRepoPath}
        tabs={tabs}
        activeTabId={activeTabId}
        commands={commands}
        projectActivity={projectActivity}
        onSelectRepo={onSelectRepo}
        onAddProject={onAddProject}
        onLaunchAssistant={onLaunchAssistant}
        onSelectTab={onSelectTab}
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
