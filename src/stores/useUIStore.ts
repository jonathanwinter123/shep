import { create } from "zustand";

interface UIStore {
  settingsTabOpen: boolean;   // tab visible in tab bar
  settingsActive: boolean;    // settings panel is the active view
  launcherOpen: boolean;      // launcher tab visible in tab bar
  launcherActive: boolean;    // launcher panel is the active view
  username: string | null;
  computerName: string | null;
  openSettings: () => void;
  closeSettingsTab: () => void;
  activateSettings: () => void;
  deactivateSettings: () => void;
  toggleSettings: () => void;
  openLauncher: () => void;
  closeLauncher: () => void;
  activateLauncher: () => void;
  deactivateLauncher: () => void;
  setUsername: (name: string) => void;
  setComputerName: (name: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  settingsTabOpen: false,
  settingsActive: false,
  launcherOpen: false,
  launcherActive: false,
  username: null,
  computerName: null,
  openSettings: () => set({ settingsTabOpen: true, settingsActive: true, launcherActive: false }),
  closeSettingsTab: () => set({ settingsTabOpen: false, settingsActive: false }),
  activateSettings: () => set({ settingsActive: true, launcherActive: false }),
  deactivateSettings: () => set({ settingsActive: false }),
  toggleSettings: () =>
    set((s) => {
      if (s.settingsTabOpen && s.settingsActive) {
        // Gear clicked while viewing settings — close the tab entirely
        return { settingsTabOpen: false, settingsActive: false };
      }
      if (s.settingsTabOpen) {
        // Tab exists but not active — re-activate it
        return { settingsActive: true, launcherActive: false };
      }
      // Tab doesn't exist — open it
      return { settingsTabOpen: true, settingsActive: true, launcherActive: false };
    }),
  openLauncher: () => set({ launcherOpen: true, launcherActive: true, settingsActive: false }),
  closeLauncher: () => set({ launcherOpen: false, launcherActive: false }),
  activateLauncher: () => set({ launcherActive: true, settingsActive: false }),
  deactivateLauncher: () => set({ launcherActive: false }),
  setUsername: (name: string) => set({ username: name }),
  setComputerName: (name: string) => set({ computerName: name }),
}));
