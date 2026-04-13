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

  /** True while the ShortcutEditor is recording a new key combo. */
  recording: boolean;
  setRecording: (recording: boolean) => void;

  /** Cached reverse map (combo → actionId). Null means needs rebuild. */
  _reverseMapCache: Map<string, string> | null;

  loadSettings: () => Promise<void>;
  setShortcut: (actionId: string, combo: string) => Promise<void>;
  resetShortcut: (actionId: string) => Promise<void>;
  getEffectiveShortcut: (actionId: string) => string | null;
  getReverseMap: () => Map<string, string>;
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  overrides: {},
  hasLoaded: false,
  isSaving: false,
  error: null,

  recording: false,
  setRecording: (recording) => set({ recording }),

  _reverseMapCache: null,

  loadSettings: async () => {
    try {
      const overrides = await getKeybindingSettings();
      set({ overrides, hasLoaded: true, error: null, _reverseMapCache: null });
    } catch (error) {
      set({ overrides: {}, hasLoaded: true, error: String(error), _reverseMapCache: null });
    }
  },

  setShortcut: async (actionId, combo) => {
    const prev = get().overrides;
    const normalized = combo ? normalizeCombo(combo) : "";
    const next = { ...prev, [actionId]: normalized };
    set({ overrides: next, isSaving: true, error: null, _reverseMapCache: null });
    try {
      await saveKeybindingSettings(next);
      set({ isSaving: false });
    } catch (error) {
      set({ overrides: prev, isSaving: false, error: String(error), _reverseMapCache: null });
    }
  },

  resetShortcut: async (actionId) => {
    const prev = get().overrides;
    const { [actionId]: _, ...next } = prev;
    set({ overrides: next, isSaving: true, error: null, _reverseMapCache: null });
    try {
      await saveKeybindingSettings(next);
      set({ isSaving: false });
    } catch (error) {
      set({ overrides: prev, isSaving: false, error: String(error), _reverseMapCache: null });
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

  getReverseMap: () => {
    const cached = get()._reverseMapCache;
    if (cached) return cached;

    const { getEffectiveShortcut } = get();
    const map = new Map<string, string>();
    for (const action of getAllActions()) {
      const combo = getEffectiveShortcut(action.id);
      if (combo) {
        map.set(normalizeCombo(combo), action.id);
      }
    }
    set({ _reverseMapCache: map });
    return map;
  },
}));
