import { create } from "zustand";
import type { TerminalTab } from "../lib/types";

interface TerminalStore {
  tabs: TerminalTab[];
  activeTabId: string | null;
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  findTabByCommand: (commandName: string) => TerminalTab | undefined;
  findTabByPtyId: (ptyId: number) => TerminalTab | undefined;
  clearTabs: () => void;
}

let tabCounter = 0;
export function nextTabId(): string {
  return `tab-${++tabCounter}`;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab: TerminalTab) => {
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },

  removeTab: (id: string) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      const activeTabId =
        state.activeTabId === id
          ? tabs.length > 0
            ? tabs[tabs.length - 1].id
            : null
          : state.activeTabId;
      return { tabs, activeTabId };
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  findTabByCommand: (commandName: string) => {
    return get().tabs.find((t) => t.commandName === commandName);
  },

  findTabByPtyId: (ptyId: number) => {
    return get().tabs.find((t) => t.ptyId === ptyId);
  },

  clearTabs: () => {
    set({ tabs: [], activeTabId: null });
  },
}));
