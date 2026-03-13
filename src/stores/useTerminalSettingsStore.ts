import { create } from "zustand";
import type { TerminalSettings } from "../lib/types";
import { getTerminalSettings, saveTerminalSettings } from "../lib/tauri";
import { applyTerminalSettings } from "../components/terminal/terminalTheme";

const DEFAULT_SETTINGS: TerminalSettings = {
  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 10000,
};

interface TerminalSettingsStore {
  settings: TerminalSettings;
  hasLoaded: boolean;
  isSaving: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<TerminalSettings>) => Promise<void>;
}

export const useTerminalSettingsStore = create<TerminalSettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hasLoaded: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    try {
      const settings = await getTerminalSettings();
      set({ settings, hasLoaded: true, error: null });
      applyTerminalSettings(settings);
    } catch (error) {
      set({ settings: DEFAULT_SETTINGS, hasLoaded: true, error: String(error) });
    }
  },

  updateSettings: async (partial) => {
    const prev = get().settings;
    const next = { ...prev, ...partial };
    // Optimistic update
    set({ settings: next, isSaving: true, error: null });
    applyTerminalSettings(next);
    try {
      await saveTerminalSettings(next);
      set({ isSaving: false });
    } catch (error) {
      // Rollback
      set({ settings: prev, isSaving: false, error: String(error) });
      applyTerminalSettings(prev);
    }
  },
}));
