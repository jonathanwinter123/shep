import { useMemo } from "react";
import type { RepoInfo, RepoGroup, CommandState } from "../../lib/types";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useCommandStore } from "../../stores/useCommandStore";
import SectionHeader from "./SectionHeader";
import ProjectList from "./ProjectList";
import SidebarFooter from "./SidebarFooter";
import SidebarUsage from "./SidebarUsage";

interface SidebarProps {
  repos: RepoInfo[];
  groups: RepoGroup[];
  activeRepoPath: string | null;
  activeTabId: string | null;
  commands: CommandState[];
  onSelectRepo: (repoPath: string) => void;
  onAddProject: (repoPath: string) => Promise<void>;
  onRemoveProject: (repoPath: string) => void;
  onNewAssistant: () => void;
  onOpenInEditor: (repoPath: string) => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewShell: () => void;
  onCreateGroup: (name: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveToGroup: (repoPath: string, groupId: string | null) => Promise<void>;
}

export default function Sidebar({
  repos,
  groups,
  activeRepoPath,
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
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onMoveToGroup,
}: SidebarProps) {
  const projectState = useTerminalStore((s) => s.projectState);
  const projectCommands = useCommandStore((s) => s.projectCommands);

  // Only subscribe to the fields that affect the sidebar badges (bell, crash).
  // Returns a stable string so the selector doesn't trigger re-renders when
  // unrelated tabActivity fields change (e.g. active toggling during streaming).
  const activityKey = useTerminalStore((s) => {
    const parts: string[] = [];
    for (const [ptyId, a] of Object.entries(s.tabActivity)) {
      if (a.bell || (!a.alive && a.exitCode !== 0)) {
        parts.push(`${ptyId}:${a.bell ? "b" : ""}${!a.alive ? `x${a.exitCode}` : ""}`);
      }
    }
    return parts.join(",");
  });

  const projectActivity = useMemo(() => {
    const tabActivity = useTerminalStore.getState().tabActivity;
    const activity: Record<string, { terminalCount: number; runningCount: number; hasAttention: boolean; hasCrash: boolean }> = {};
    for (const repo of repos) {
      const ps = projectState[repo.path];
      const repoTabs = ps?.tabs ?? [];
      const cmds = projectCommands[repo.path] ?? [];
      let hasAttention = false;
      let hasCrash = false;
      for (const tab of repoTabs) {
        if (tab.kind !== "terminal" && tab.kind !== "assistant") continue;
        const a = tabActivity[tab.ptyId];
        if (a) {
          if (a.bell) hasAttention = true;
          if (!a.alive && a.exitCode !== 0) hasCrash = true;
        }
      }
      activity[repo.path] = {
        terminalCount: repoTabs.filter((t) => t.kind === "terminal" || t.kind === "assistant").length,
        runningCount: cmds.filter((c) => c.status === "running").length,
        hasAttention,
        hasCrash,
      };
    }
    return activity;
  }, [repos, projectState, projectCommands, activityKey]);

  return (
    <div className="w-72 shrink-0 flex flex-col h-full pr-4 mr-4 border-r border-[var(--glass-border)]" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex-1 overflow-y-auto min-h-0">
        <SectionHeader label="Projects" />
        <ProjectList
          repos={repos}
          groups={groups}
          activeRepoPath={activeRepoPath}
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
          onCreateGroup={onCreateGroup}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
          onMoveToGroup={onMoveToGroup}
        />
      </div>
      <SidebarUsage />
      <SidebarFooter />
    </div>
  );
}
