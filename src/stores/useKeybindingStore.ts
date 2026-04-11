import { create } from "zustand";
import type { KeybindingSettings } from "../lib/types";
import { getKeybindingSettings, saveKeybindingSettings } from "../lib/tauri";

// Legacy defaults — kept for backwards compatibility until Task 8 removes this store.
// Values are "enabled" / "" to match the new Record<string, string> type.
const DEFAULT_SETTINGS: KeybindingSettings = {
  shiftEnterNewline: "enabled",
  optionDeleteWord: "enabled",
  cmdKClear: "enabled",
};

interface KeybindingStore {
  settings: KeybindingSettings;
  hasLoaded: boolean;
  isSaving: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
}

export const useKeybindingStore = create<KeybindingStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hasLoaded: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    try {
      const settings = await getKeybindingSettings();
      set({ settings, hasLoaded: true, error: null });
    } catch (error) {
      set({ settings: DEFAULT_SETTINGS, hasLoaded: true, error: String(error) });
    }
  },

  setEnabled: async (id, enabled) => {
    const prev = get().settings;
    const next = { ...prev, [id]: enabled ? "enabled" : "" };
    // Optimistic update
    set({ settings: next, isSaving: true, error: null });
    try {
      await saveKeybindingSettings(next);
      set({ isSaving: false });
    } catch (error) {
      // Rollback
      set({ settings: prev, isSaving: false, error: String(error) });
    }
  },
}));
