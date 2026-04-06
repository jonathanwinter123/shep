import { create } from "zustand";
import type { GitStatus, WorktreeEntry } from "../lib/types";
import { gitStatus, gitListWorktrees } from "../lib/tauri";

interface GitStore {
  projectGitStatus: Record<string, GitStatus>;
  /** Cached worktree lists keyed by main repo path */
  worktreesByRepo: Record<string, WorktreeEntry[]>;
  refreshStatus: (repoPath: string) => Promise<void>;
  refreshAll: (repoPaths: string[]) => Promise<void>;
  refreshWorktrees: (repoPath: string) => Promise<void>;
  /** Get all non-main worktree paths for a repo (for file watching) */
  getWorktreePaths: (repoPath: string) => string[];
  removeProject: (repoPath: string) => void;
}

export const useGitStore = create<GitStore>((set, get) => ({
  projectGitStatus: {},
  worktreesByRepo: {},

  refreshStatus: async (repoPath: string) => {
    try {
      const status = await gitStatus(repoPath);
      set((state) => ({
        projectGitStatus: { ...state.projectGitStatus, [repoPath]: status },
      }));
    } catch {
      // Silently ignore — non-git repos return is_git_repo: false from backend
    }
  },

  refreshAll: async (repoPaths: string[]) => {
    const results = await Promise.allSettled(
      repoPaths.map((p) => gitStatus(p)),
    );

    set((state) => {
      const prev = state.projectGitStatus;
      let changed = false;
      const next = { ...prev };

      for (let i = 0; i < repoPaths.length; i++) {
        const result = results[i];
        if (result.status !== "fulfilled") continue;
        const path = repoPaths[i];
        const status = result.value;
        const old = prev[path];
        // Only update if the status actually changed
        if (!old || old.branch !== status.branch || old.dirty !== status.dirty || old.is_git_repo !== status.is_git_repo) {
          next[path] = status;
          changed = true;
        }
      }

      return changed ? { projectGitStatus: next } : state;
    });
  },

  refreshWorktrees: async (repoPath: string) => {
    try {
      const entries = await gitListWorktrees(repoPath);
      set((state) => {
        const prev = state.worktreesByRepo[repoPath];
        // Only update if the list actually changed
        if (prev && prev.length === entries.length &&
          prev.every((e, i) => e.path === entries[i].path && e.branch === entries[i].branch)) {
          return state;
        }
        return {
          worktreesByRepo: { ...state.worktreesByRepo, [repoPath]: entries },
        };
      });
    } catch {
      // Silently ignore
    }
  },

  getWorktreePaths: (repoPath: string): string[] => {
    const entries = get().worktreesByRepo[repoPath];
    if (!entries) return [];
    return entries.filter((e) => !e.is_main).map((e) => e.path);
  },

  removeProject: (repoPath: string) => {
    set((state) => {
      const { [repoPath]: _, ...restStatus } = state.projectGitStatus;
      const { [repoPath]: __, ...restWorktrees } = state.worktreesByRepo;
      return { projectGitStatus: restStatus, worktreesByRepo: restWorktrees };
    });
  },
}));
