import { create } from "zustand";
import type { RepoInfo, RepoGroup, WorkspaceConfig } from "../lib/types";
import {
  listRepos,
  registerRepo,
  unregisterRepo,
  loadWorkspace,
  listGroups,
  createGroup as ipcCreateGroup,
  renameGroup as ipcRenameGroup,
  deleteGroup as ipcDeleteGroup,
  moveRepoToGroup as ipcMoveRepoToGroup,
} from "../lib/tauri";

const EMPTY_REPOS: RepoInfo[] = [];
const EMPTY_GROUPS: RepoGroup[] = [];

interface RepoStore {
  repos: RepoInfo[];
  groups: RepoGroup[];
  activeRepoPath: string | null;
  activeConfig: WorkspaceConfig | null;
  fetchRepos: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  openRepo: (repoPath: string) => Promise<WorkspaceConfig>;
  addRepo: (repoPath: string) => Promise<WorkspaceConfig>;
  removeRepo: (repoPath: string) => Promise<void>;
  setActiveConfig: (config: WorkspaceConfig | null) => void;
  clearRepo: () => void;
  createGroup: (name: string) => Promise<RepoGroup>;
  renameGroup: (groupId: string, newName: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  moveRepoToGroup: (repoPath: string, groupId: string | null) => Promise<void>;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: EMPTY_REPOS,
  groups: EMPTY_GROUPS,
  activeRepoPath: null,
  activeConfig: null,

  fetchRepos: async () => {
    const repos = await listRepos();
    set((state) => {
      const activeStillExists = state.activeRepoPath
        ? repos.some((repo) => repo.path === state.activeRepoPath)
        : true;

      return {
        repos,
        ...(activeStillExists ? {} : { activeRepoPath: null, activeConfig: null }),
      };
    });
  },

  fetchGroups: async () => {
    const groups = await listGroups();
    set({ groups });
  },

  openRepo: async (repoPath: string) => {
    const config = await loadWorkspace(repoPath);
    set({ activeRepoPath: repoPath, activeConfig: config });
    return config;
  },

  addRepo: async (repoPath: string) => {
    const registered = await registerRepo(repoPath);
    const repos = await listRepos();
    set({
      repos,
      activeRepoPath: registered.path,
      activeConfig: registered.workspace,
    });
    return registered.workspace;
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

  createGroup: async (name: string) => {
    const group = await ipcCreateGroup(name);
    const groups = await listGroups();
    set({ groups });
    return group;
  },

  renameGroup: async (groupId: string, newName: string) => {
    await ipcRenameGroup(groupId, newName);
    const groups = await listGroups();
    set({ groups });
  },

  deleteGroup: async (groupId: string) => {
    await ipcDeleteGroup(groupId);
    const [groups, repos] = await Promise.all([listGroups(), listRepos()]);
    set({ groups, repos });
  },

  moveRepoToGroup: async (repoPath: string, groupId: string | null) => {
    await ipcMoveRepoToGroup(repoPath, groupId);
    const repos = await listRepos();
    set({ repos });
  },
}));
