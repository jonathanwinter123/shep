import { useMemo, useState, useEffect } from "react";
import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import ProjectItem from "./ProjectItem";
import CollapsibleSection from "./CollapsibleSection";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import CommandList from "./CommandList";
import GitStatusRow from "./GitStatusRow";
import IdeLaunchRow from "./IdeLaunchRow";

interface ProjectListProps {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  tabs: TerminalTab[];
  activeTabId: string | null;
  commands: CommandState[];
  projectActivity: Record<string, { terminalCount: number; runningCount: number }>;
  onSelectRepo: (repoPath: string) => void;
  onAddProject: (repoPath: string) => void;
  onRemoveProject: (repoPath: string) => void;
  onNewAssistant: () => void;
  onOpenInEditor: (repoPath: string) => void;
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
  projectActivity,
  onSelectRepo,
  onAddProject,
  onRemoveProject,
  onNewAssistant,
  onOpenInEditor,
  onSelectTab,
  onCloseTab,
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

  const assistantTabs = useMemo(
    () => tabs.filter((t) => t.assistantId !== null),
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
              onOpenInEditor={() => onOpenInEditor(repo.path)}
              onRemove={() => onRemoveProject(repo.path)}
              onClick={() => handleProjectClick(repo.path)}
            />
            {isExpanded && (
              <div className="mt-1 mb-2">
                {/* Quick-add actions */}
                <div className="flex flex-col gap-0.5 pl-4 mb-1">
                  <button className="list-item w-full opacity-50 hover:opacity-100" onClick={onNewAssistant}>
                    <span>+</span>
                    <span>New AI Assistant</span>
                  </button>
                  <button className="list-item w-full opacity-50 hover:opacity-100" onClick={onNewShell}>
                    <span>+</span>
                    <span>New Terminal</span>
                  </button>
                </div>

                {/* Sections — only shown when populated */}
                {assistantTabs.length > 0 && (
                  <CollapsibleSection
                    label="AI Assistants"
                    badge={assistantTabs.length}
                  >
                    <AssistantList
                      assistantTabs={assistantTabs}
                      activeTabId={activeTabId}
                      onSelectTab={onSelectTab}
                      onCloseTab={onCloseTab}
                    />
                  </CollapsibleSection>
                )}

                {shellTabs.length > 0 && (
                  <CollapsibleSection
                    label="Terminals"
                    badge={shellTabs.length}
                  >
                    <TerminalList
                      tabs={shellTabs}
                      activeTabId={activeTabId}
                      onSelectTab={onSelectTab}
                      onCloseTab={onCloseTab}
                    />
                  </CollapsibleSection>
                )}

                <GitStatusRow repoPath={repo.path} />
                <IdeLaunchRow
                  repoPath={repo.path}
                  onOpenInEditor={onOpenInEditor}
                />

                {commands.length > 0 && (
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
                )}
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
