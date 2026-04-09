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
  usageTabOpen: boolean;      // usage tab visible in tab bar
  usagePanelActive: boolean;  // usage panel is the active view
  portsPanelOpen: boolean;    // ports tab visible in tab bar
  portsPanelActive: boolean;  // ports panel is the active view
  sessionHistoryOpen: boolean;   // session history tab visible in tab bar
  sessionHistoryActive: boolean; // session history panel is the active view
  sidebarVisible: boolean;    // sidebar visibility
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
  closeUsageTab: () => void;
  activateUsagePanel: () => void;
  deactivateUsagePanel: () => void;
  toggleUsagePanel: () => void;
  openPortsPanel: () => void;
  closePortsPanel: () => void;
  activatePortsPanel: () => void;
  deactivatePortsPanel: () => void;
  togglePortsPanel: () => void;
  openSessionHistory: () => void;
  closeSessionHistory: () => void;
  activateSessionHistory: () => void;
  deactivateSessionHistory: () => void;
  toggleSessionHistory: () => void;
  toggleSidebar: () => void;
  setUsername: (name: string) => void;
  setComputerName: (name: string) => void;
}

/** When closing an active panel tab, activate the next open panel tab (if any). */
function activateNextOpen(s: UIStore, excluding: string): Partial<UIStore> {
  const candidates: [string, boolean][] = [
    ["settings", s.settingsTabOpen],
    ["git", s.gitPanelOpen],
    ["commands", s.commandsPanelOpen],
    ["launcher", s.launcherOpen],
    ["usage", s.usageTabOpen],
    ["ports", s.portsPanelOpen],
    ["sessionHistory", s.sessionHistoryOpen],
  ];
  for (const [name, isOpen] of candidates) {
    if (name === excluding || !isOpen) continue;
    switch (name) {
      case "settings": return { settingsActive: true };
      case "git": return { gitPanelActive: true };
      case "commands": return { commandsPanelActive: true };
      case "launcher": return { launcherActive: true };
      case "usage": return { usagePanelActive: true };
      case "ports": return { portsPanelActive: true };
      case "sessionHistory": return { sessionHistoryActive: true };
    }
  }
  return {};
}

const deactivateAll = {
  settingsActive: false,
  gitPanelActive: false,
  commandsPanelActive: false,
  launcherActive: false,
  usagePanelActive: false,
  portsPanelActive: false,
  sessionHistoryActive: false,
};

export const useUIStore = create<UIStore>((set) => ({
  settingsTabOpen: false,
  settingsActive: false,
  gitPanelOpen: false,
  gitPanelActive: false,
  commandsPanelOpen: false,
  commandsPanelActive: false,
  launcherOpen: false,
  launcherActive: false,
  usageTabOpen: false,
  usagePanelActive: false,
  portsPanelOpen: false,
  portsPanelActive: false,
  sessionHistoryOpen: false,
  sessionHistoryActive: false,
  sidebarVisible: true,
  username: null,
  computerName: null,
  openSettings: () => set({
    settingsTabOpen: true,
    ...deactivateAll,
    settingsActive: true,
  }),
  closeSettingsTab: () =>
    set((s) => ({
      settingsTabOpen: false,
      settingsActive: false,
      ...activateNextOpen(s, "settings"),
    })),
  activateSettings: () => set({
    ...deactivateAll,
    settingsActive: true,
  }),
  deactivateSettings: () => set({ settingsActive: false }),
  toggleSettings: () =>
    set((s) => {
      if (s.settingsTabOpen && s.settingsActive) {
        return { settingsTabOpen: false, settingsActive: false, ...activateNextOpen(s, "settings") };
      }
      if (s.settingsTabOpen) {
        return { ...deactivateAll, settingsActive: true };
      }
      return { settingsTabOpen: true, ...deactivateAll, settingsActive: true };
    }),
  openGitPanel: () => set({
    gitPanelOpen: true,
    ...deactivateAll,
    gitPanelActive: true,
  }),
  closeGitPanel: () =>
    set((s) => ({
      gitPanelOpen: false,
      gitPanelActive: false,
      ...activateNextOpen(s, "git"),
    })),
  activateGitPanel: () => set({
    ...deactivateAll,
    gitPanelActive: true,
  }),
  deactivateGitPanel: () => set({ gitPanelActive: false }),
  toggleGitPanel: () =>
    set((s) => {
      if (s.gitPanelOpen && s.gitPanelActive) {
        return { gitPanelOpen: false, gitPanelActive: false, ...activateNextOpen(s, "git") };
      }
      if (s.gitPanelOpen) {
        return { ...deactivateAll, gitPanelActive: true };
      }
      return { gitPanelOpen: true, ...deactivateAll, gitPanelActive: true };
    }),
  openCommandsPanel: () => set({
    commandsPanelOpen: true,
    ...deactivateAll,
    commandsPanelActive: true,
  }),
  closeCommandsPanel: () =>
    set((s) => ({
      commandsPanelOpen: false,
      commandsPanelActive: false,
      ...activateNextOpen(s, "commands"),
    })),
  activateCommandsPanel: () => set({
    ...deactivateAll,
    commandsPanelActive: true,
  }),
  deactivateCommandsPanel: () => set({ commandsPanelActive: false }),
  toggleCommandsPanel: () =>
    set((s) => {
      if (s.commandsPanelOpen && s.commandsPanelActive) {
        return { commandsPanelOpen: false, commandsPanelActive: false, ...activateNextOpen(s, "commands") };
      }
      if (s.commandsPanelOpen) {
        return { ...deactivateAll, commandsPanelActive: true };
      }
      return { commandsPanelOpen: true, ...deactivateAll, commandsPanelActive: true };
    }),
  openLauncher: () => set({
    launcherOpen: true,
    ...deactivateAll,
    launcherActive: true,
  }),
  closeLauncher: () =>
    set((s) => ({
      launcherOpen: false,
      launcherActive: false,
      ...activateNextOpen(s, "launcher"),
    })),
  activateLauncher: () => set({
    ...deactivateAll,
    launcherActive: true,
  }),
  deactivateLauncher: () => set({ launcherActive: false }),
  openUsagePanel: () => set({
    usageTabOpen: true,
    ...deactivateAll,
    usagePanelActive: true,
  }),
  closeUsageTab: () =>
    set((s) => ({
      usageTabOpen: false,
      usagePanelActive: false,
      ...activateNextOpen(s, "usage"),
    })),
  activateUsagePanel: () => set({
    ...deactivateAll,
    usagePanelActive: true,
  }),
  deactivateUsagePanel: () => set({ usagePanelActive: false }),
  toggleUsagePanel: () =>
    set((s) => {
      if (s.usageTabOpen && s.usagePanelActive) {
        return { usageTabOpen: false, usagePanelActive: false, ...activateNextOpen(s, "usage") };
      }
      if (s.usageTabOpen) {
        return { ...deactivateAll, usagePanelActive: true };
      }
      return { usageTabOpen: true, ...deactivateAll, usagePanelActive: true };
    }),
  openPortsPanel: () => set({
    portsPanelOpen: true,
    ...deactivateAll,
    portsPanelActive: true,
  }),
  closePortsPanel: () =>
    set((s) => ({
      portsPanelOpen: false,
      portsPanelActive: false,
      ...activateNextOpen(s, "ports"),
    })),
  activatePortsPanel: () => set({
    ...deactivateAll,
    portsPanelActive: true,
  }),
  deactivatePortsPanel: () => set({ portsPanelActive: false }),
  togglePortsPanel: () =>
    set((s) => {
      if (s.portsPanelOpen && s.portsPanelActive) {
        return { portsPanelOpen: false, portsPanelActive: false, ...activateNextOpen(s, "ports") };
      }
      if (s.portsPanelOpen) {
        return { ...deactivateAll, portsPanelActive: true };
      }
      return { portsPanelOpen: true, ...deactivateAll, portsPanelActive: true };
    }),
  openSessionHistory: () => set({
    sessionHistoryOpen: true,
    ...deactivateAll,
    sessionHistoryActive: true,
  }),
  closeSessionHistory: () =>
    set((s) => ({
      sessionHistoryOpen: false,
      sessionHistoryActive: false,
      ...activateNextOpen(s, "sessionHistory"),
    })),
  activateSessionHistory: () => set({
    ...deactivateAll,
    sessionHistoryActive: true,
  }),
  deactivateSessionHistory: () => set({ sessionHistoryActive: false }),
  toggleSessionHistory: () =>
    set((s) => {
      if (s.sessionHistoryOpen && s.sessionHistoryActive) {
        return { sessionHistoryOpen: false, sessionHistoryActive: false, ...activateNextOpen(s, "sessionHistory") };
      }
      if (s.sessionHistoryOpen) {
        return { ...deactivateAll, sessionHistoryActive: true };
      }
      return { sessionHistoryOpen: true, ...deactivateAll, sessionHistoryActive: true };
    }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setUsername: (name: string) => set({ username: name }),
  setComputerName: (name: string) => set({ computerName: name }),
}));
