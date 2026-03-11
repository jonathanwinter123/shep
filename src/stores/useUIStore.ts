import { create } from "zustand";

interface UIStore {
  settingsTabOpen: boolean;   // tab visible in tab bar
  settingsActive: boolean;    // settings panel is the active view
  gitPanelOpen: boolean;      // git tab visible in tab bar
  gitPanelActive: boolean;    // git panel is the active view
  launcherOpen: boolean;      // launcher tab visible in tab bar
  launcherActive: boolean;    // launcher panel is the active view
  username: string | null;
  computerName: string | null;
  openSettings: () => void;
  closeSettingsTab: () => void;
  activateSettings: () => void;
  deactivateSettings: () => void;
  toggleSettings: () => void;
  openGitPanel: () => void;
  closeGitPanel: () => void;
  activateGitPanel: () => void;
  deactivateGitPanel: () => void;
  toggleGitPanel: () => void;
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
  gitPanelOpen: false,
  gitPanelActive: false,
  launcherOpen: false,
  launcherActive: false,
  username: null,
  computerName: null,
  openSettings: () => set({ settingsTabOpen: true, settingsActive: true, launcherActive: false, gitPanelActive: false }),
  closeSettingsTab: () => set({ settingsTabOpen: false, settingsActive: false }),
  activateSettings: () => set({ settingsActive: true, launcherActive: false, gitPanelActive: false }),
  deactivateSettings: () => set({ settingsActive: false }),
  toggleSettings: () =>
    set((s) => {
      if (s.settingsTabOpen && s.settingsActive) {
        return { settingsTabOpen: false, settingsActive: false };
      }
      if (s.settingsTabOpen) {
        return { settingsActive: true, launcherActive: false, gitPanelActive: false };
      }
      return { settingsTabOpen: true, settingsActive: true, launcherActive: false, gitPanelActive: false };
    }),
  openGitPanel: () => set({ gitPanelOpen: true, gitPanelActive: true, settingsActive: false, launcherActive: false }),
  closeGitPanel: () => set({ gitPanelOpen: false, gitPanelActive: false }),
  activateGitPanel: () => set({ gitPanelActive: true, settingsActive: false, launcherActive: false }),
  deactivateGitPanel: () => set({ gitPanelActive: false }),
  toggleGitPanel: () =>
    set((s) => {
      if (s.gitPanelOpen && s.gitPanelActive) {
        return { gitPanelOpen: false, gitPanelActive: false };
      }
      if (s.gitPanelOpen) {
        return { gitPanelActive: true, settingsActive: false, launcherActive: false };
      }
      return { gitPanelOpen: true, gitPanelActive: true, settingsActive: false, launcherActive: false };
    }),
  openLauncher: () => set({ launcherOpen: true, launcherActive: true, settingsActive: false, gitPanelActive: false }),
  closeLauncher: () => set({ launcherOpen: false, launcherActive: false }),
  activateLauncher: () => set({ launcherActive: true, settingsActive: false, gitPanelActive: false }),
  deactivateLauncher: () => set({ launcherActive: false }),
  setUsername: (name: string) => set({ username: name }),
  setComputerName: (name: string) => set({ computerName: name }),
}));
