import { create } from "zustand";
import type { RepoInfo, WorkspaceConfig } from "../lib/types";
import {
  listRepos,
  registerRepo,
  unregisterRepo,
  loadWorkspace,
} from "../lib/tauri";

interface RepoStore {
  repos: RepoInfo[];
  activeRepoPath: string | null;
  activeConfig: WorkspaceConfig | null;
  fetchRepos: () => Promise<void>;
  openRepo: (repoPath: string) => Promise<WorkspaceConfig>;
  addRepo: (repoPath: string) => Promise<WorkspaceConfig>;
  removeRepo: (repoPath: string) => Promise<void>;
  setActiveConfig: (config: WorkspaceConfig | null) => void;
  clearRepo: () => void;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: [],
  activeRepoPath: null,
  activeConfig: null,

  fetchRepos: async () => {
    const repos = await listRepos();
    set({ repos });
  },

  openRepo: async (repoPath: string) => {
    const config = await loadWorkspace(repoPath);
    set({ activeRepoPath: repoPath, activeConfig: config });
    return config;
  },

  addRepo: async (repoPath: string) => {
    const config = await registerRepo(repoPath);
    const repos = await listRepos();
    // Use the canonical path from the repo list (Rust canonicalizes it)
    const registered = repos.find((r) => r.name === config.name);
    const canonicalPath = registered?.path ?? repoPath;
    set({ repos, activeRepoPath: canonicalPath, activeConfig: config });
    return config;
  },

  removeRepo: async (repoPath: string) => {
    await unregisterRepo(repoPath);
    const repos = await listRepos();
    const isActive = get().activeRepoPath === repoPath;
    set({
      repos,
      ...(isActive ? { activeRepoPath: null, activeConfig: null } : {}),
    });
  },

  setActiveConfig: (config: WorkspaceConfig | null) => {
    set({ activeConfig: config });
  },

  clearRepo: () => {
    set({ activeRepoPath: null, activeConfig: null });
  },
}));
