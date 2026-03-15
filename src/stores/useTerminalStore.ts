import { create } from "zustand";
import type { TerminalTab, TabActivity } from "../lib/types";

interface ProjectTerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
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
  updateLastActivity: (ptyId: number) => void;
  clearTabBell: (ptyId: number) => void;
  removeActivity: (ptyId: number) => void;
}

function emptyState(): ProjectTerminalState {
  return { tabs: [], activeTabId: null };
}

function getActiveState(state: TerminalStore): ProjectTerminalState {
  if (!state.activeProjectPath) return emptyState();
  return state.projectState[state.activeProjectPath] ?? emptyState();
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
        projectState: { ...state.projectState, [repoPath]: emptyState() },
        activeProjectPath: repoPath,
      };
    });
  },

  removeProject: (repoPath: string) => {
    set((state) => {
      const projectState = { ...state.projectState };
      const removedTabs = projectState[repoPath]?.tabs ?? [];
      delete projectState[repoPath];

      const tabActivity = { ...state.tabActivity };
      for (const tab of removedTabs) {
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
      const current = state.projectState[path] ?? emptyState();
      return {
        projectState: {
          ...state.projectState,
          [path]: {
            tabs: [...current.tabs, tab],
            activeTabId: tab.id,
          },
        },
      };
    });
  },

  removeTab: (id: string) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const current = state.projectState[path] ?? emptyState();
      const tabs = current.tabs.filter((t) => t.id !== id);
      const activeTabId =
        current.activeTabId === id
          ? tabs.length > 0
            ? tabs[tabs.length - 1].id
            : null
          : current.activeTabId;
      return {
        projectState: {
          ...state.projectState,
          [path]: { tabs, activeTabId },
        },
      };
    });
  },

  setActiveTab: (id: string) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const current = state.projectState[path] ?? emptyState();
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...current, activeTabId: id },
        },
      };
    });
  },

  updateTab: (id: string, patch: Partial<TerminalTab>) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const current = state.projectState[path] ?? emptyState();
      const tabs = current.tabs.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      );
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...current, tabs },
        },
      };
    });
  },

  reorderTab: (tabId: string, toIndex: number) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const current = state.projectState[path] ?? emptyState();
      const fromIndex = current.tabs.findIndex((t) => t.id === tabId);
      if (fromIndex === -1) return state;

      const boundedIndex = Math.max(0, Math.min(toIndex, current.tabs.length));
      const targetIndex = boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
      if (fromIndex === targetIndex) return state;

      const tabs = [...current.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(targetIndex, 0, moved);
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...current, tabs },
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
        [ptyId]: { alive: true, active: true, exitCode: null, bell: false, lastActivityAt: Date.now() },
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

  updateLastActivity: (ptyId: number) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, lastActivityAt: Date.now() } } };
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
}));
