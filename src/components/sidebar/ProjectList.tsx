import { useCallback, useMemo, useState } from "react";
import type { RepoInfo, CommandState } from "../../lib/types";
import { open } from "@tauri-apps/plugin-dialog";
import { Sparkles, SquareTerminal } from "lucide-react";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitStore } from "../../stores/useGitStore";
import { useWorktreeDialogStore } from "../../stores/useWorktreeDialogStore";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { gitStatus, gitPushBranch, gitRemoveWorktree } from "../../lib/tauri";
import { getErrorMessage } from "../../lib/errors";
import ProjectItem from "./ProjectItem";
import CollapsibleSection from "./CollapsibleSection";
import AssistantList from "./AssistantList";
import TerminalList from "./TerminalList";
import CommandsRow from "./CommandsRow";
import GitStatusRow from "./GitStatusRow";
import WorkspaceRow from "./WorkspaceRow";

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
  onSwitchWorkspace: (repoPath: string, workspaceId: string) => void;
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
  onSwitchWorkspace,
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

  // Get workspace data for the active project
  const projectState = useTerminalStore(
    (s) => activeRepoPath ? s.projectState[activeRepoPath] : null,
  );
  const activeWorkspaceId = projectState?.activeWorkspaceId ?? "main";
  const activeWorkspace = projectState?.workspaces?.[activeWorkspaceId];
  const activeTabs = activeWorkspace?.tabs ?? [];

  const currentBranch = useGitStore(
    (s) => activeRepoPath ? s.projectGitStatus[activeRepoPath]?.branch ?? "" : "",
  );

  const workspaces = useMemo(() => {
    if (!projectState) return [];
    return Object.entries(projectState.workspaces)
      .map(([id, ws]) => ({ id, label: ws.label, tabs: ws.tabs.map((t) => ({ ptyId: t.ptyId })) }));
  }, [projectState]);

  const assistantTabs = useMemo(
    () => activeTabs.filter((t) => t.assistantId !== null),
    [activeTabs],
  );

  const shellTabs = useMemo(
    () => activeTabs.filter((t) => !t.assistantId),
    [activeTabs],
  );

  // Effective git path: resolve worktree path from git store by branch name
  const worktreeBranch = activeWorkspaceId !== "main" ? activeWorkspaceId : null;
  const effectiveGitPath = useGitStore((s) => {
    if (!worktreeBranch || !activeRepoPath) return activeRepoPath;
    const entries = s.worktreesByRepo[activeRepoPath];
    if (!entries) return activeRepoPath;
    return entries.find((e) => e.branch === worktreeBranch)?.path ?? activeRepoPath;
  });

  const pushNotice = useNoticeStore((s) => s.pushNotice);

  const handleRemoveWorktree = useCallback(async (workspaceId: string) => {
    if (!activeRepoPath) return;
    const ws = projectState?.workspaces?.[workspaceId];
    if (!ws) return;

    // Resolve worktree path from git store
    const wtPath = useGitStore.getState().getWorktreePath(activeRepoPath, workspaceId);
    if (!wtPath) return;

    // Check dirty status
    const st = await gitStatus(wtPath).catch(() => null);
    const dirty = st?.dirty ?? false;

    const choice = await useWorktreeDialogStore.getState().open({
      tabId: "",
      branch: workspaceId,
      worktreePath: wtPath,
      repoPath: activeRepoPath,
      dirty,
    });

    if (!choice) return;

    if (choice === "push") {
      try {
        await gitPushBranch(wtPath, workspaceId);
        pushNotice({ tone: "success", title: `Pushed ${workspaceId} to remote` });
      } catch (error) {
        pushNotice({ tone: "error", title: "Push failed", message: getErrorMessage(error) });
        return;
      }
      await gitRemoveWorktree(activeRepoPath, wtPath).catch((error) => {
        pushNotice({ tone: "error", title: "Worktree cleanup failed", message: getErrorMessage(error) });
      });
      useTerminalStore.getState().removeWorkspace(activeRepoPath, workspaceId);
    } else if (choice === "discard") {
      await gitRemoveWorktree(activeRepoPath, wtPath).catch((error) => {
        pushNotice({ tone: "error", title: "Worktree cleanup failed", message: getErrorMessage(error) });
      });
      useTerminalStore.getState().removeWorkspace(activeRepoPath, workspaceId);
    }
    // "keep" — leave worktree on disk, just remove from sidebar
    if (choice === "keep") {
      useTerminalStore.getState().removeWorkspace(activeRepoPath, workspaceId);
    }
  }, [activeRepoPath, projectState, pushNotice]);

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
              activeWorkspaceId={isActive ? activeWorkspaceId : "main"}
              onOpenInEditor={() => onOpenInEditor(repo.path)}
              onRemove={() => onRemoveProject(repo.path)}
              onClick={() => handleProjectClick(repo.path)}
            />
            {isExpanded && (
              <div className="mt-1 mb-2 flex flex-col gap-0.5 pl-2">

                <WorkspaceRow
                  worktrees={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  currentBranch={currentBranch}
                  onSwitchWorkspace={(wsId) => onSwitchWorkspace(repo.path, wsId)}
                  onRemoveWorktree={handleRemoveWorktree}
                  activeContent={
                    <>
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
                      {effectiveGitPath && <GitStatusRow repoPath={effectiveGitPath} />}
                    </>
                  }
                />
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
