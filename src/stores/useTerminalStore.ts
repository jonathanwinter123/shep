import { create } from "zustand";
import type { TerminalTab, TabActivity, PersistedTab, PersistedTabType } from "../lib/types";
import { saveTabState } from "../lib/tauri";

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
  clearTabBell: (ptyId: number) => void;
  removeActivity: (ptyId: number) => void;
  getAllProjectTabs: (repoPath: string) => TerminalTab[];
}

function emptyState(): ProjectTerminalState {
  return { tabs: [], activeTabId: null };
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
      const project = projectState[repoPath];
      delete projectState[repoPath];

      const tabActivity = { ...state.tabActivity };
      if (project) {
        for (const tab of project.tabs) {
          delete tabActivity[tab.ptyId];
        }
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
      const ps = state.projectState[path] ?? emptyState();
      return {
        projectState: {
          ...state.projectState,
          [path]: {
            tabs: [...ps.tabs, tab],
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
      const ps = state.projectState[path];
      if (!ps) return state;
      const tabs = ps.tabs.filter((t) => t.id !== id);
      const activeTabId =
        ps.activeTabId === id
          ? tabs.length > 0 ? tabs[tabs.length - 1].id : null
          : ps.activeTabId;
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
      const ps = state.projectState[path];
      if (!ps || !ps.tabs.some((t) => t.id === id)) return state;
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...ps, activeTabId: id },
        },
      };
    });
  },

  updateTab: (id: string, patch: Partial<TerminalTab>) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path];
      if (!ps) return state;
      return {
        projectState: {
          ...state.projectState,
          [path]: {
            ...ps,
            tabs: ps.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          },
        },
      };
    });
  },

  reorderTab: (tabId: string, toIndex: number) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path];
      if (!ps) return state;
      const fromIndex = ps.tabs.findIndex((t) => t.id === tabId);
      if (fromIndex === -1) return state;

      const boundedIndex = Math.max(0, Math.min(toIndex, ps.tabs.length));
      const targetIndex = boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
      if (fromIndex === targetIndex) return state;

      const tabs = [...ps.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(targetIndex, 0, moved);
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...ps, tabs },
        },
      };
    });
  },

  findTabByCommand: (commandName: string) => {
    const state = get();
    if (!state.activeProjectPath) return undefined;
    const ps = state.projectState[state.activeProjectPath];
    return ps?.tabs.find((t) => t.commandName === commandName);
  },

  findTabByPtyId: (ptyId: number) => {
    const state = get();
    if (!state.activeProjectPath) return undefined;
    const ps = state.projectState[state.activeProjectPath];
    return ps?.tabs.find((t) => t.ptyId === ptyId);
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

  getAllProjectTabs: (repoPath: string) => {
    const ps = get().projectState[repoPath];
    return ps?.tabs ?? [];
  },
}));

// ── Persistence: serialize projectState to the backend on change ────────

function toPersistedTab(tab: TerminalTab, position: number, isActive: boolean): PersistedTab {
  let tabType: PersistedTabType = "shell";
  if (tab.assistantId) tabType = "assistant";
  else if (tab.commandName) tabType = "command";

  return {
    id: tab.id,
    position,
    label: tab.label,
    tabType,
    commandName: tab.commandName,
    assistantId: tab.assistantId,
    sessionMode: tab.sessionMode,
    sessionId: tab.sessionId,
    isActive,
  };
}

const SAVE_DEBOUNCE_MS = 300;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSave(repoPath: string) {
  const existing = pendingTimers.get(repoPath);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingTimers.delete(repoPath);
    const ps = useTerminalStore.getState().projectState[repoPath];
    if (!ps) return;
    const tabs = ps.tabs.map((tab, i) =>
      toPersistedTab(tab, i, tab.id === ps.activeTabId),
    );
    void saveTabState(repoPath, tabs).catch((err) => {
      if (import.meta.env.DEV) console.error("saveTabState failed:", err);
    });
  }, SAVE_DEBOUNCE_MS);

  pendingTimers.set(repoPath, timer);
}

// Subscribe once at module load. Any change to projectState in any project
// schedules a save for that project.
let previousProjectState: Record<string, ProjectTerminalState> = {};
useTerminalStore.subscribe((state) => {
  for (const [repoPath, ps] of Object.entries(state.projectState)) {
    if (previousProjectState[repoPath] !== ps) {
      scheduleSave(repoPath);
    }
  }
  previousProjectState = state.projectState;
});
