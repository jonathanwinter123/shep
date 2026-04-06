import { create } from "zustand";
import type { GitStatus } from "../lib/types";
import { gitStatus } from "../lib/tauri";

interface GitStore {
  projectGitStatus: Record<string, GitStatus>;
  refreshStatus: (repoPath: string) => Promise<void>;
  refreshAll: (repoPaths: string[]) => Promise<void>;
  removeProject: (repoPath: string) => void;
}

export const useGitStore = create<GitStore>((set) => ({
  projectGitStatus: {},

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
        if (!old || old.branch !== status.branch || old.dirty !== status.dirty || old.is_git_repo !== status.is_git_repo) {
          next[path] = status;
          changed = true;
        }
      }

      return changed ? { projectGitStatus: next } : state;
    });
  },

  removeProject: (repoPath: string) => {
    set((state) => {
      const { [repoPath]: _, ...rest } = state.projectGitStatus;
      return { projectGitStatus: rest };
    });
  },
}));
