import { create } from "zustand";
import type { KeybindingSettings } from "../lib/types";
import { getKeybindingSettings, saveKeybindingSettings } from "../lib/tauri";
import { getAction, getAllActions } from "../lib/actionRegistry";
import { normalizeCombo } from "../lib/keyCombo";

interface ShortcutStore {
  /** User overrides loaded from config. Action ID → key combo (or "" for unbound). */
  overrides: KeybindingSettings;
  hasLoaded: boolean;
  isSaving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  setShortcut: (actionId: string, combo: string) => Promise<void>;
  resetShortcut: (actionId: string) => Promise<void>;
  getEffectiveShortcut: (actionId: string) => string | null;
  buildReverseMap: () => Map<string, string>;
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  overrides: {},
  hasLoaded: false,
  isSaving: false,
  error: null,

  loadSettings: async () => {
    try {
      const overrides = await getKeybindingSettings();
      set({ overrides, hasLoaded: true, error: null });
    } catch (error) {
      set({ overrides: {}, hasLoaded: true, error: String(error) });
    }
  },

  setShortcut: async (actionId, combo) => {
    const prev = get().overrides;
    const normalized = combo ? normalizeCombo(combo) : "";
    const next = { ...prev, [actionId]: normalized };
    set({ overrides: next, isSaving: true, error: null });
    try {
      await saveKeybindingSettings(next);
      set({ isSaving: false });
    } catch (error) {
      set({ overrides: prev, isSaving: false, error: String(error) });
    }
  },

  resetShortcut: async (actionId) => {
    const prev = get().overrides;
    const { [actionId]: _, ...next } = prev;
    set({ overrides: next, isSaving: true, error: null });
    try {
      await saveKeybindingSettings(next);
      set({ isSaving: false });
    } catch (error) {
      set({ overrides: prev, isSaving: false, error: String(error) });
    }
  },

  getEffectiveShortcut: (actionId) => {
    const { overrides } = get();
    if (actionId in overrides) {
      const val = overrides[actionId];
      return val === "" ? null : val;
    }
    return getAction(actionId)?.defaultShortcut ?? null;
  },

  buildReverseMap: () => {
    const { getEffectiveShortcut } = get();
    const map = new Map<string, string>();
    for (const action of getAllActions()) {
      const combo = getEffectiveShortcut(action.id);
      if (combo) {
        map.set(normalizeCombo(combo), action.id);
      }
    }
    return map;
  },
}));
