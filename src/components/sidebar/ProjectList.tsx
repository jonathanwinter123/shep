import { useMemo, useState, useEffect } from "react";
import type { RepoInfo, TerminalTab, CommandState } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { Sparkles, SquareTerminal } from "lucide-react";
import ProjectItem from "./ProjectItem";
import CollapsibleSection from "./CollapsibleSection";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import GitStatusRow from "./GitStatusRow";
import CommandsRow from "./CommandsRow";

interface ProjectListProps {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  tabs: TerminalTab[];
  activeTabId: string | null;
  commands: CommandState[];
  projectActivity: Record<string, { terminalCount: number; runningCount: number; hasAttention: boolean; hasCrash: boolean }>;
  onSelectRepo: (repoPath: string) => void;
  onAddProject: (repoPath: string) => void;
  onRemoveProject: (repoPath: string) => void;
  onNewAssistant: () => void;
  onOpenInEditor: (repoPath: string) => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewShell: () => void;
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

  const commandsBadge = String(commands.length);

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
              <div className="mt-1 mb-2 flex flex-col gap-0.5 pl-2">
                <CollapsibleSection
                  label="AI Assistants"
                  icon={<Sparkles size={14} />}
                  badge={assistantTabs.length || null}
                  hasItems={assistantTabs.length > 0}
                  onAdd={onNewAssistant}
                >
                  <AssistantList
                    assistantTabs={assistantTabs}
                    activeTabId={activeTabId}
                    onSelectTab={onSelectTab}
                    onCloseTab={onCloseTab}
                  />
                </CollapsibleSection>

                <CollapsibleSection
                  label="Terminals"
                  icon={<SquareTerminal size={14} />}
                  badge={shellTabs.length || null}
                  hasItems={shellTabs.length > 0}
                  onAdd={onNewShell}
                >
                  <TerminalList
                    tabs={shellTabs}
                    activeTabId={activeTabId}
                    onSelectTab={onSelectTab}
                    onCloseTab={onCloseTab}
                  />
                </CollapsibleSection>

                <CommandsRow badge={commandsBadge} />
                <GitStatusRow repoPath={repo.path} />
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
