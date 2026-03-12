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
  onRemoveProject: (repoPath: string) => void;
  onNewAssistant: () => void;
  onOpenInEditor: (repoPath: string) => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewShell: () => void;
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
  onNewAssistant,
  onOpenInEditor,
  onSelectTab,
  onCloseTab,
  onNewShell,
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
    <div className="w-72 shrink-0 flex flex-col h-full pr-4 mr-4 border-r border-white/8" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex-1 overflow-y-auto min-h-0">
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
          onRemoveProject={onRemoveProject}
          onNewAssistant={onNewAssistant}
          onOpenInEditor={onOpenInEditor}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onNewShell={onNewShell}
        />
      </div>
      <SidebarFooter
        activeRepoPath={activeRepoPath}
        onOpenInEditor={onOpenInEditor}
      />
    </div>
  );
}
