import { create } from "zustand";
import type { TerminalTab, TabActivity } from "../lib/types";

export interface WorkspaceState {
  label: string;
  path: string;
  tabs: TerminalTab[];
  activeTabId: string | null;
}

interface ProjectTerminalState {
  /** Active workspace's tabs — for backward-compatible access */
  tabs: TerminalTab[];
  /** Active workspace's active tab — for backward-compatible access */
  activeTabId: string | null;
  /** All workspaces keyed by ID ("main", branch names, etc.) */
  workspaces: Record<string, WorkspaceState>;
  /** Currently active workspace */
  activeWorkspaceId: string;
}

interface TerminalStore {
  projectState: Record<string, ProjectTerminalState>;
  activeProjectPath: string | null;
  tabActivity: Record<number, TabActivity>;
  switchProject: (repoPath: string) => void;
  removeProject: (repoPath: string) => void;
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<TerminalTab>) => void;
  reorderTab: (tabId: string, toIndex: number) => void;
  findTabByCommand: (commandName: string) => TerminalTab | undefined;
  findTabByPtyId: (ptyId: number) => TerminalTab | undefined;
  initActivity: (ptyId: number) => void;
  setTabActive: (ptyId: number, active: boolean) => void;
  setTabExited: (ptyId: number, exitCode: number) => void;
  setTabBell: (ptyId: number) => void;
  clearTabBell: (ptyId: number) => void;
  removeActivity: (ptyId: number) => void;
  // Workspace methods
  addWorkspace: (repoPath: string, id: string, label: string, path: string) => void;
  removeWorkspace: (repoPath: string, id: string) => void;
  switchWorkspace: (repoPath: string, workspaceId: string) => void;
  getActiveWorkspacePath: () => string | null;
  getAllProjectTabs: (repoPath: string) => TerminalTab[];
}

function emptyWorkspace(label: string, path: string): WorkspaceState {
  return { label, path, tabs: [], activeTabId: null };
}

function emptyState(repoPath: string): ProjectTerminalState {
  const main = emptyWorkspace("main", repoPath);
  return {
    tabs: main.tabs,
    activeTabId: main.activeTabId,
    workspaces: { main },
    activeWorkspaceId: "main",
  };
}

/** Sync the top-level tabs/activeTabId from the active workspace */
function syncFromWorkspace(ps: ProjectTerminalState): ProjectTerminalState {
  const ws = ps.workspaces[ps.activeWorkspaceId];
  if (!ws) return ps;
  return { ...ps, tabs: ws.tabs, activeTabId: ws.activeTabId };
}

function getActiveState(state: TerminalStore): ProjectTerminalState {
  if (!state.activeProjectPath) return emptyState("");
  return state.projectState[state.activeProjectPath] ?? emptyState(state.activeProjectPath);
}

let tabCounter = 0;
export function nextTabId(): string {
  return `tab-${++tabCounter}`;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  projectState: {},
  activeProjectPath: null,
  tabActivity: {},

  switchProject: (repoPath: string) => {
    set((state) => {
      if (state.projectState[repoPath]) {
        return { activeProjectPath: repoPath };
      }
      return {
        projectState: { ...state.projectState, [repoPath]: emptyState(repoPath) },
        activeProjectPath: repoPath,
      };
    });
  },

  removeProject: (repoPath: string) => {
    set((state) => {
      const projectState = { ...state.projectState };
      const project = projectState[repoPath];
      const allTabs = project
        ? Object.values(project.workspaces).flatMap((ws) => ws.tabs)
        : [];
      delete projectState[repoPath];

      const tabActivity = { ...state.tabActivity };
      for (const tab of allTabs) {
        delete tabActivity[tab.ptyId];
      }

      return {
        projectState,
        tabActivity,
        ...(state.activeProjectPath === repoPath
          ? { activeProjectPath: null }
          : {}),
      };
    });
  },

  addTab: (tab: TerminalTab) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState(path);
      const wsId = ps.activeWorkspaceId;
      const ws = ps.workspaces[wsId] ?? emptyWorkspace("main", path);
      const updatedWs: WorkspaceState = {
        ...ws,
        tabs: [...ws.tabs, tab],
        activeTabId: tab.id,
      };
      const updated: ProjectTerminalState = {
        ...ps,
        workspaces: { ...ps.workspaces, [wsId]: updatedWs },
      };
      return {
        projectState: {
          ...state.projectState,
          [path]: syncFromWorkspace(updated),
        },
      };
    });
  },

  removeTab: (id: string) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState(path);
      const wsId = ps.activeWorkspaceId;
      const ws = ps.workspaces[wsId];
      if (!ws) return state;
      const tabs = ws.tabs.filter((t) => t.id !== id);
      const activeTabId =
        ws.activeTabId === id
          ? tabs.length > 0
            ? tabs[tabs.length - 1].id
            : null
          : ws.activeTabId;
      const updatedWs: WorkspaceState = { ...ws, tabs, activeTabId };
      const updated: ProjectTerminalState = {
        ...ps,
        workspaces: { ...ps.workspaces, [wsId]: updatedWs },
      };
      return {
        projectState: {
          ...state.projectState,
          [path]: syncFromWorkspace(updated),
        },
      };
    });
  },

  setActiveTab: (id: string) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState(path);

      // Search all workspaces for the tab — auto-switch if needed
      let targetWsId = ps.activeWorkspaceId;
      const activeWs = ps.workspaces[targetWsId];
      if (!activeWs || !activeWs.tabs.some((t) => t.id === id)) {
        const found = Object.entries(ps.workspaces).find(([, ws]) =>
          ws.tabs.some((t) => t.id === id),
        );
        if (!found) return state;
        targetWsId = found[0];
      }

      const ws = ps.workspaces[targetWsId];
      const updatedWs: WorkspaceState = { ...ws, activeTabId: id };
      const updated: ProjectTerminalState = {
        ...ps,
        activeWorkspaceId: targetWsId,
        workspaces: { ...ps.workspaces, [targetWsId]: updatedWs },
      };
      return {
        projectState: {
          ...state.projectState,
          [path]: syncFromWorkspace(updated),
        },
      };
    });
  },

  updateTab: (id: string, patch: Partial<TerminalTab>) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState(path);
      const wsId = ps.activeWorkspaceId;
      const ws = ps.workspaces[wsId];
      if (!ws) return state;
      const tabs = ws.tabs.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      );
      const updatedWs: WorkspaceState = { ...ws, tabs };
      const updated: ProjectTerminalState = {
        ...ps,
        workspaces: { ...ps.workspaces, [wsId]: updatedWs },
      };
      return {
        projectState: {
          ...state.projectState,
          [path]: syncFromWorkspace(updated),
        },
      };
    });
  },

  reorderTab: (tabId: string, toIndex: number) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState(path);
      const wsId = ps.activeWorkspaceId;
      const ws = ps.workspaces[wsId];
      if (!ws) return state;
      const fromIndex = ws.tabs.findIndex((t) => t.id === tabId);
      if (fromIndex === -1) return state;

      const boundedIndex = Math.max(0, Math.min(toIndex, ws.tabs.length));
      const targetIndex = boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
      if (fromIndex === targetIndex) return state;

      const tabs = [...ws.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(targetIndex, 0, moved);
      const updatedWs: WorkspaceState = { ...ws, tabs };
      const updated: ProjectTerminalState = {
        ...ps,
        workspaces: { ...ps.workspaces, [wsId]: updatedWs },
      };
      return {
        projectState: {
          ...state.projectState,
          [path]: syncFromWorkspace(updated),
        },
      };
    });
  },

  findTabByCommand: (commandName: string) => {
    const active = getActiveState(get());
    return active.tabs.find((t) => t.commandName === commandName);
  },

  findTabByPtyId: (ptyId: number) => {
    const active = getActiveState(get());
    return active.tabs.find((t) => t.ptyId === ptyId);
  },

  initActivity: (ptyId: number) => {
    set((state) => ({
      tabActivity: {
        ...state.tabActivity,
        [ptyId]: { alive: true, active: true, exitCode: null, bell: false },
      },
    }));
  },

  setTabActive: (ptyId: number, active: boolean) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev || prev.active === active) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, active } } };
    });
  },

  setTabExited: (ptyId: number, exitCode: number) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, alive: false, exitCode } } };
    });
  },

  setTabBell: (ptyId: number) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, bell: true } } };
    });
  },

  clearTabBell: (ptyId: number) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, bell: false } } };
    });
  },

  removeActivity: (ptyId: number) => {
    set((state) => {
      const { [ptyId]: _, ...rest } = state.tabActivity;
      return { tabActivity: rest };
    });
  },

  // ── Workspace methods ─────────────────────────────────────────────

  addWorkspace: (repoPath: string, id: string, label: string, wsPath: string) => {
    set((state) => {
      const ps = state.projectState[repoPath] ?? emptyState(repoPath);
      if (ps.workspaces[id]) return state; // Already exists
      const updated: ProjectTerminalState = {
        ...ps,
        workspaces: {
          ...ps.workspaces,
          [id]: emptyWorkspace(label, wsPath),
        },
      };
      return {
        projectState: { ...state.projectState, [repoPath]: updated },
      };
    });
  },

  removeWorkspace: (repoPath: string, id: string) => {
    if (id === "main") return; // Can't remove main workspace
    set((state) => {
      const ps = state.projectState[repoPath];
      if (!ps) return state;
      const { [id]: removed, ...restWorkspaces } = ps.workspaces;
      // Clean up activity for removed workspace's tabs
      const tabActivity = { ...state.tabActivity };
      if (removed) {
        for (const tab of removed.tabs) {
          delete tabActivity[tab.ptyId];
        }
      }
      const switchToMain = ps.activeWorkspaceId === id;
      const updated: ProjectTerminalState = {
        ...ps,
        workspaces: restWorkspaces,
        activeWorkspaceId: switchToMain ? "main" : ps.activeWorkspaceId,
      };
      return {
        projectState: {
          ...state.projectState,
          [repoPath]: syncFromWorkspace(updated),
        },
        tabActivity,
      };
    });
  },

  switchWorkspace: (repoPath: string, workspaceId: string) => {
    set((state) => {
      const ps = state.projectState[repoPath];
      if (!ps || !ps.workspaces[workspaceId]) return state;
      if (ps.activeWorkspaceId === workspaceId) return state;
      const updated: ProjectTerminalState = {
        ...ps,
        activeWorkspaceId: workspaceId,
      };
      return {
        projectState: {
          ...state.projectState,
          [repoPath]: syncFromWorkspace(updated),
        },
      };
    });
  },

  getActiveWorkspacePath: () => {
    const state = get();
    if (!state.activeProjectPath) return null;
    const ps = state.projectState[state.activeProjectPath];
    if (!ps) return null;
    const ws = ps.workspaces[ps.activeWorkspaceId];
    return ws?.path ?? state.activeProjectPath;
  },

  getAllProjectTabs: (repoPath: string) => {
    const ps = get().projectState[repoPath];
    if (!ps) return [];
    return Object.values(ps.workspaces).flatMap((ws) => ws.tabs);
  },
}));
