import { useMemo, useState } from "react";
import type { RepoInfo, CommandState } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { Sparkles, SquareTerminal } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";
import ProjectItem from "./ProjectItem";
import CollapsibleSection from "./CollapsibleSection";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import CommandsRow from "./CommandsRow";
import GitStatusRow from "./GitStatusRow";

interface ProjectListProps {
  repos: RepoInfo[];
  activeRepoPath: string | null;
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
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(activeRepoPath ? [activeRepoPath] : []),
  );

  // Auto-expand a newly selected project
  const prevActiveRef = useState({ path: activeRepoPath })[0];
  if (activeRepoPath && activeRepoPath !== prevActiveRef.path) {
    prevActiveRef.path = activeRepoPath;
    if (!expandedPaths.has(activeRepoPath)) {
      setExpandedPaths((prev) => new Set(prev).add(activeRepoPath));
    }
  }

  const handleProjectClick = (repoPath: string) => {
    if (repoPath === activeRepoPath) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(repoPath)) next.delete(repoPath);
        else next.add(repoPath);
        return next;
      });
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

  // Get the workspaces record (stable ref) and derive flat tab lists
  const workspaces = useTerminalStore(
    (s) => activeRepoPath ? s.projectState[activeRepoPath]?.workspaces ?? null : null,
  );

  const assistantTabs = useMemo(() => {
    if (!workspaces) return [];
    return Object.values(workspaces).flatMap((ws) => ws.tabs).filter((t) => t.assistantId !== null);
  }, [workspaces]);

  const shellTabs = useMemo(() => {
    if (!workspaces) return [];
    return Object.values(workspaces).flatMap((ws) => ws.tabs).filter((t) => !t.assistantId);
  }, [workspaces]);

  const commandsBadge = String(commands.length);

  return (
    <div className="flex flex-col gap-0.5 px-2 pb-2">
      {[...repos].sort((a, b) => a.name.localeCompare(b.name)).map((repo) => {
        const isActive = repo.path === activeRepoPath;
        const isExpanded = isActive && expandedPaths.has(repo.path);
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
