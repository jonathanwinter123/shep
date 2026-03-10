import { useMemo, useState, useEffect } from "react";
import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import ProjectItem from "./ProjectItem";
import CollapsibleSection from "./CollapsibleSection";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import CommandList from "./CommandList";

interface ProjectListProps {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  tabs: TerminalTab[];
  activeTabId: string | null;
  commands: CommandState[];
  projectActivity: Record<string, { terminalCount: number; runningCount: number }>;
  onSelectRepo: (repoPath: string) => void;
  onAddProject: (repoPath: string) => void;
  onLaunchAssistant: (assistantId: string) => void;
  onSelectTab: (tabId: string) => void;
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
  projectActivity,
  onSelectRepo,
  onAddProject,
  onLaunchAssistant,
  onSelectTab,
  onNewShell,
  onStartCommand,
  onStopCommand,
  onFocusCommand,
}: ProjectListProps) {
  const [expandedPath, setExpandedPath] = useState<string | null>(activeRepoPath);

  // Auto-expand when active project changes (e.g. first load, switching projects)
  useEffect(() => {
    setExpandedPath(activeRepoPath);
  }, [activeRepoPath]);

  const handleProjectClick = (repoPath: string) => {
    if (repoPath === activeRepoPath) {
      setExpandedPath(expandedPath === repoPath ? null : repoPath);
    } else {
      onSelectRepo(repoPath);
    }
  };

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

  const runningAssistantIds = useMemo(
    () => tabs.filter((t) => t.assistantId).map((t) => t.assistantId!),
    [tabs],
  );

  const shellTabs = useMemo(
    () => tabs.filter((t) => !t.assistantId),
    [tabs],
  );

  const runningCommandCount = useMemo(
    () => commands.filter((c) => c.status === "running").length,
    [commands],
  );

  const commandsBadge = commands.length > 0
    ? `${runningCommandCount} / ${commands.length}`
    : null;

  return (
    <div className="flex flex-col gap-0.5 px-2 pb-2">
      {repos.map((repo) => {
        const isActive = repo.path === activeRepoPath;
        const isExpanded = isActive && expandedPath === repo.path;
        return (
          <div key={repo.path}>
            <ProjectItem
              repo={repo}
              isActive={isActive}
              isExpanded={isExpanded}
              activity={projectActivity[repo.path]}
              onClick={() => handleProjectClick(repo.path)}
            />
            {isExpanded && (
              <div className="mt-1 mb-2">
                <CollapsibleSection
                  label="AI Assistants"
                  badge={runningAssistantIds.length || null}
                >
                  <AssistantList
                    onLaunch={onLaunchAssistant}
                    runningAssistantIds={runningAssistantIds}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  label="Terminals"
                  badge={shellTabs.length || null}
                >
                  <TerminalList
                    tabs={shellTabs}
                    activeTabId={activeTabId}
                    onSelectTab={onSelectTab}
                    onNewShell={onNewShell}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  label="Commands"
                  badge={commandsBadge}
                >
                  <CommandList
                    commands={commands}
                    onStart={onStartCommand}
                    onStop={onStopCommand}
                    onFocus={onFocusCommand}
                  />
                </CollapsibleSection>
              </div>
            )}
          </div>
        );
      })}
      <button className="btn-ghost w-full mt-1" onClick={handleAddClick}>
        <span>+</span>
        <span>Add Project</span>
      </button>
    </div>
  );
}
