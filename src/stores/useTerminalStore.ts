import { create } from "zustand";
import type { TerminalTab } from "../lib/types";

interface ProjectTerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
}

interface TerminalStore {
  projectState: Record<string, ProjectTerminalState>;
  activeProjectPath: string | null;
  switchProject: (repoPath: string) => void;
  removeProject: (repoPath: string) => void;
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  findTabByCommand: (commandName: string) => TerminalTab | undefined;
  findTabByPtyId: (ptyId: number) => TerminalTab | undefined;
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

  switchProject: (repoPath: string) => {
    set((state) => {
      if (state.projectState[repoPath]) {
        // Project already exists — only change the active pointer
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
      delete projectState[repoPath];
      return {
        projectState,
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

  findTabByCommand: (commandName: string) => {
    const active = getActiveState(get());
    return active.tabs.find((t) => t.commandName === commandName);
  },

  findTabByPtyId: (ptyId: number) => {
    const active = getActiveState(get());
    return active.tabs.find((t) => t.ptyId === ptyId);
  },
}));
