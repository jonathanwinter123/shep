import { create } from "zustand";
import { DEFAULT_THEME_ID, getThemeById } from "../lib/themes";
import type { ShepTheme } from "../lib/themes";

const STORAGE_KEY = "shep:theme";

function loadThemeId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

interface ThemeStore {
  themeId: string;
  theme: ShepTheme;
  setTheme: (id: string) => void;
}

const initialId = loadThemeId();
const initialTheme = getThemeById(initialId);

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: initialTheme.id,
  theme: initialTheme,
  setTheme: (id: string) => {
    const theme = getThemeById(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme.id);
    } catch { /* ignore */ }
    set({ themeId: theme.id, theme });
  },
}));
