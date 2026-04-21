import { create } from "zustand";

interface DiffViewFile {
  path: string;
  area: string;
}

interface UIStore {
  settingsActive: boolean;
  usagePanelActive: boolean;
  portsPanelActive: boolean;
  sidebarVisible: boolean;
  diffPanelVisible: boolean;
  activeDiffFile: DiffViewFile | null;
  username: string | null;
  computerName: string | null;
  toggleSettings: () => void;
  toggleUsagePanel: () => void;
  togglePortsPanel: () => void;
  deactivateAllOverlays: () => void;
  toggleSidebar: () => void;
  toggleDiffPanel: () => void;
  openDiffFile: (path: string, area: string) => void;
  setUsername: (name: string) => void;
  setComputerName: (name: string) => void;
}

const deactivateAll = {
  settingsActive: false,
  usagePanelActive: false,
  portsPanelActive: false,
  activeDiffFile: null,
};

export const useUIStore = create<UIStore>((set) => ({
  settingsActive: false,
  usagePanelActive: false,
  portsPanelActive: false,
  sidebarVisible: true,
  diffPanelVisible: true,
  activeDiffFile: null,
  username: null,
  computerName: null,
  toggleSettings: () =>
    set((s) => {
      if (s.settingsActive) return { settingsActive: false };
      return { ...deactivateAll, settingsActive: true };
    }),
  toggleUsagePanel: () =>
    set((s) => {
      if (s.usagePanelActive) return { usagePanelActive: false };
      return { ...deactivateAll, usagePanelActive: true };
    }),
  togglePortsPanel: () =>
    set((s) => {
      if (s.portsPanelActive) return { portsPanelActive: false };
      return { ...deactivateAll, portsPanelActive: true };
    }),
  deactivateAllOverlays: () => set(deactivateAll),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleDiffPanel: () => set((s) => ({ diffPanelVisible: !s.diffPanelVisible })),
  openDiffFile: (path, area) => set({ ...deactivateAll, activeDiffFile: { path, area } }),
  setUsername: (name: string) => set({ username: name }),
  setComputerName: (name: string) => set({ computerName: name }),
}));
