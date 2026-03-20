import { create } from "zustand";

interface UIStore {
  settingsTabOpen: boolean;   // tab visible in tab bar
  settingsActive: boolean;    // settings panel is the active view
  gitPanelOpen: boolean;      // git tab visible in tab bar
  gitPanelActive: boolean;    // git panel is the active view
  commandsPanelOpen: boolean; // commands tab visible in tab bar
  commandsPanelActive: boolean; // commands panel is the active view
  launcherOpen: boolean;      // launcher tab visible in tab bar
  launcherActive: boolean;    // launcher panel is the active view
  usagePanelActive: boolean;  // usage panel is the active view
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
  openCommandsPanel: () => void;
  closeCommandsPanel: () => void;
  activateCommandsPanel: () => void;
  deactivateCommandsPanel: () => void;
  toggleCommandsPanel: () => void;
  openLauncher: () => void;
  closeLauncher: () => void;
  activateLauncher: () => void;
  deactivateLauncher: () => void;
  openUsagePanel: () => void;
  closeUsagePanel: () => void;
  toggleUsagePanel: () => void;
  setUsername: (name: string) => void;
  setComputerName: (name: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  settingsTabOpen: false,
  settingsActive: false,
  gitPanelOpen: false,
  gitPanelActive: false,
  commandsPanelOpen: false,
  commandsPanelActive: false,
  launcherOpen: false,
  launcherActive: false,
  usagePanelActive: false,
  username: null,
  computerName: null,
  openSettings: () => set({
    settingsTabOpen: true,
    settingsActive: true,
    launcherActive: false,
    gitPanelActive: false,
    commandsPanelActive: false,
    usagePanelActive: false,
  }),
  closeSettingsTab: () => set({ settingsTabOpen: false, settingsActive: false }),
  activateSettings: () => set({
    settingsActive: true,
    launcherActive: false,
    gitPanelActive: false,
    commandsPanelActive: false,
    usagePanelActive: false,
  }),
  deactivateSettings: () => set({ settingsActive: false }),
  toggleSettings: () =>
    set((s) => {
      if (s.settingsTabOpen && s.settingsActive) {
        return { settingsTabOpen: false, settingsActive: false };
      }
      if (s.settingsTabOpen) {
        return {
          settingsActive: true,
          launcherActive: false,
          gitPanelActive: false,
          commandsPanelActive: false,
          usagePanelActive: false,
        };
      }
      return {
        settingsTabOpen: true,
        settingsActive: true,
        launcherActive: false,
        gitPanelActive: false,
        commandsPanelActive: false,
        usagePanelActive: false,
      };
    }),
  openGitPanel: () => set({
    gitPanelOpen: true,
    gitPanelActive: true,
    settingsActive: false,
    launcherActive: false,
    commandsPanelActive: false,
    usagePanelActive: false,
  }),
  closeGitPanel: () => set({ gitPanelOpen: false, gitPanelActive: false }),
  activateGitPanel: () => set({
    gitPanelActive: true,
    settingsActive: false,
    launcherActive: false,
    commandsPanelActive: false,
    usagePanelActive: false,
  }),
  deactivateGitPanel: () => set({ gitPanelActive: false }),
  toggleGitPanel: () =>
    set((s) => {
      if (s.gitPanelOpen && s.gitPanelActive) {
        return { gitPanelOpen: false, gitPanelActive: false };
      }
      if (s.gitPanelOpen) {
        return {
          gitPanelActive: true,
          settingsActive: false,
          launcherActive: false,
          commandsPanelActive: false,
          usagePanelActive: false,
        };
      }
      return {
        gitPanelOpen: true,
        gitPanelActive: true,
        settingsActive: false,
        launcherActive: false,
        commandsPanelActive: false,
        usagePanelActive: false,
      };
    }),
  openCommandsPanel: () => set({
    commandsPanelOpen: true,
    commandsPanelActive: true,
    settingsActive: false,
    gitPanelActive: false,
    launcherActive: false,
    usagePanelActive: false,
  }),
  closeCommandsPanel: () => set({ commandsPanelOpen: false, commandsPanelActive: false }),
  activateCommandsPanel: () => set({
    commandsPanelActive: true,
    settingsActive: false,
    gitPanelActive: false,
    launcherActive: false,
    usagePanelActive: false,
  }),
  deactivateCommandsPanel: () => set({ commandsPanelActive: false }),
  toggleCommandsPanel: () =>
    set((s) => {
      if (s.commandsPanelOpen && s.commandsPanelActive) {
        return { commandsPanelOpen: false, commandsPanelActive: false };
      }
      if (s.commandsPanelOpen) {
        return {
          commandsPanelActive: true,
          settingsActive: false,
          gitPanelActive: false,
          launcherActive: false,
          usagePanelActive: false,
        };
      }
      return {
        commandsPanelOpen: true,
        commandsPanelActive: true,
        settingsActive: false,
        gitPanelActive: false,
        launcherActive: false,
        usagePanelActive: false,
      };
    }),
  openLauncher: () => set({
    launcherOpen: true,
    launcherActive: true,
    settingsActive: false,
    gitPanelActive: false,
    commandsPanelActive: false,
    usagePanelActive: false,
  }),
  closeLauncher: () => set({ launcherOpen: false, launcherActive: false }),
  activateLauncher: () => set({
    launcherActive: true,
    settingsActive: false,
    gitPanelActive: false,
    commandsPanelActive: false,
    usagePanelActive: false,
  }),
  deactivateLauncher: () => set({ launcherActive: false }),
  openUsagePanel: () => set({
    usagePanelActive: true,
    settingsActive: false,
    gitPanelActive: false,
    commandsPanelActive: false,
    launcherActive: false,
  }),
  closeUsagePanel: () => set({ usagePanelActive: false }),
  toggleUsagePanel: () =>
    set((s) => ({
      usagePanelActive: !s.usagePanelActive,
      ...(s.usagePanelActive ? {} : {
        settingsActive: false,
        gitPanelActive: false,
        commandsPanelActive: false,
        launcherActive: false,
      }),
    })),
  setUsername: (name: string) => set({ username: name }),
  setComputerName: (name: string) => set({ computerName: name }),
}));
