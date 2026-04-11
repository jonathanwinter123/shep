import { registerAction, clearRegistry } from "./actionRegistry";
import { useUIStore } from "../stores/useUIStore";
import { useTerminalStore } from "../stores/useTerminalStore";
import { writePty } from "./tauri";

export function registerActions(callbacks: {
  newShell: () => void;
  newAssistant: () => void;
  closeTab: (tabId: string) => void;
  openInEditor: (repoPath: string) => void;
}) {
  clearRegistry();

  // Tab selection by position (Cmd+1 through Cmd+9)
  for (let i = 1; i <= 9; i++) {
    const index = i - 1;
    registerAction({
      id: `shep.tab.select.${i}`,
      label: `Switch to Tab ${i}`,
      category: "Tabs",
      defaultShortcut: `Cmd+${i}`,
      execute: () => {
        const store = useTerminalStore.getState();
        const path = store.activeProjectPath;
        if (!path) return;
        const tabs = store.projectState[path]?.tabs ?? [];
        if (index < tabs.length) {
          deactivateAllOverlays();
          store.setActiveTab(tabs[index].id);
          store.clearTabBell(tabs[index].ptyId);
        }
      },
    });
  }

  // Next tab
  registerAction({
    id: "shep.tab.next",
    label: "Next Tab",
    category: "Tabs",
    defaultShortcut: "Cmd+Shift+]",
    execute: () => {
      const store = useTerminalStore.getState();
      const path = store.activeProjectPath;
      if (!path) return;
      const ps = store.projectState[path];
      if (!ps || ps.tabs.length === 0) return;
      const idx = ps.tabs.findIndex((t) => t.id === ps.activeTabId);
      const next = ps.tabs[(idx + 1) % ps.tabs.length];
      deactivateAllOverlays();
      store.setActiveTab(next.id);
      store.clearTabBell(next.ptyId);
    },
  });

  // Previous tab
  registerAction({
    id: "shep.tab.prev",
    label: "Previous Tab",
    category: "Tabs",
    defaultShortcut: "Cmd+Shift+[",
    execute: () => {
      const store = useTerminalStore.getState();
      const path = store.activeProjectPath;
      if (!path) return;
      const ps = store.projectState[path];
      if (!ps || ps.tabs.length === 0) return;
      const idx = ps.tabs.findIndex((t) => t.id === ps.activeTabId);
      const prev = ps.tabs[(idx - 1 + ps.tabs.length) % ps.tabs.length];
      deactivateAllOverlays();
      store.setActiveTab(prev.id);
      store.clearTabBell(prev.ptyId);
    },
  });

  // Close tab
  registerAction({
    id: "shep.tab.close",
    label: "Close Tab",
    category: "Tabs",
    defaultShortcut: "Cmd+W",
    execute: () => {
      const store = useTerminalStore.getState();
      const path = store.activeProjectPath;
      if (!path) return;
      const ps = store.projectState[path];
      if (!ps || !ps.activeTabId) return;
      callbacks.closeTab(ps.activeTabId);
    },
  });

  // Next assistant waiting for input (bell=true)
  registerAction({
    id: "shep.tab.nextAssistantWaiting",
    label: "Next Waiting Assistant",
    category: "Tabs",
    defaultShortcut: "Cmd+Shift+A",
    execute: () => {
      const store = useTerminalStore.getState();
      const path = store.activeProjectPath;
      if (!path) return;
      const ps = store.projectState[path];
      if (!ps || ps.tabs.length === 0) return;

      const currentIdx = ps.tabs.findIndex((t) => t.id === ps.activeTabId);
      const len = ps.tabs.length;

      for (let offset = 1; offset <= len; offset++) {
        const tab = ps.tabs[(currentIdx + offset) % len];
        if (tab.assistantId && store.tabActivity[tab.ptyId]?.bell) {
          deactivateAllOverlays();
          store.setActiveTab(tab.id);
          store.clearTabBell(tab.ptyId);
          return;
        }
      }
    },
  });

  // New terminal
  registerAction({
    id: "shep.session.newTerminal",
    label: "New Terminal",
    category: "Sessions",
    defaultShortcut: "Cmd+T",
    execute: callbacks.newShell,
  });

  // New AI assistant
  registerAction({
    id: "shep.session.newAssistant",
    label: "New AI Assistant",
    category: "Sessions",
    defaultShortcut: "Cmd+Shift+T",
    execute: callbacks.newAssistant,
  });

  // Panel toggles
  registerAction({
    id: "shep.panel.toggleSidebar",
    label: "Toggle Sidebar",
    category: "Panels",
    defaultShortcut: "Cmd+B",
    execute: () => useUIStore.getState().toggleSidebar(),
  });

  registerAction({
    id: "shep.panel.toggleSettings",
    label: "Toggle Settings",
    category: "Panels",
    defaultShortcut: "Cmd+,",
    execute: () => useUIStore.getState().toggleSettings(),
  });

  registerAction({
    id: "shep.panel.toggleGit",
    label: "Toggle Git Panel",
    category: "Panels",
    defaultShortcut: "Cmd+Shift+G",
    execute: () => useUIStore.getState().toggleGitPanel(),
  });

  registerAction({
    id: "shep.panel.toggleCommands",
    label: "Toggle Commands Panel",
    category: "Panels",
    defaultShortcut: "Cmd+Shift+C",
    execute: () => useUIStore.getState().toggleCommandsPanel(),
  });

  registerAction({
    id: "shep.panel.toggleUsage",
    label: "Toggle Usage Panel",
    category: "Panels",
    defaultShortcut: null,
    execute: () => useUIStore.getState().toggleUsagePanel(),
  });

  registerAction({
    id: "shep.panel.togglePorts",
    label: "Toggle Ports Panel",
    category: "Panels",
    defaultShortcut: null,
    execute: () => useUIStore.getState().togglePortsPanel(),
  });

  registerAction({
    id: "shep.panel.toggleSessions",
    label: "Toggle Sessions Panel",
    category: "Panels",
    defaultShortcut: null,
    execute: () => useUIStore.getState().toggleSessionHistory(),
  });

  // Open in editor
  registerAction({
    id: "shep.editor.open",
    label: "Open in Editor",
    category: "Sessions",
    defaultShortcut: "Cmd+E",
    execute: () => {
      const repoPath = useTerminalStore.getState().activeProjectPath;
      if (repoPath) callbacks.openInEditor(repoPath);
    },
  });

  // Terminal keybindings
  registerAction({
    id: "terminal.newLine",
    label: "Send Newline",
    category: "Terminal",
    defaultShortcut: "Shift+Enter",
    execute: () => writeToActivePty("\n"),
  });

  registerAction({
    id: "terminal.deleteWord",
    label: "Delete Word",
    category: "Terminal",
    defaultShortcut: "Option+Delete",
    execute: () => writeToActivePty("\x17"),
  });

  registerAction({
    id: "terminal.clearTerminal",
    label: "Clear Terminal",
    category: "Terminal",
    defaultShortcut: "Cmd+K",
    execute: () => writeToActivePty("\x0c"),
  });
}

function deactivateAllOverlays() {
  const ui = useUIStore.getState();
  ui.deactivateSettings();
  ui.deactivateGitPanel();
  ui.deactivateCommandsPanel();
  ui.deactivateLauncher();
  ui.deactivateUsagePanel();
  ui.deactivatePortsPanel();
  ui.deactivateSessionHistory();
}

function writeToActivePty(sequence: string) {
  const store = useTerminalStore.getState();
  const path = store.activeProjectPath;
  if (!path) return;
  const ps = store.projectState[path];
  if (!ps || !ps.activeTabId) return;
  const tab = ps.tabs.find((t) => t.id === ps.activeTabId);
  if (!tab) return;
  void writePty(tab.ptyId, sequence);
}
