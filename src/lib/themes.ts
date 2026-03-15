export interface ShepTheme {
  id: string;
  name: string;

  // Body background
  bgRadial1: string;
  bgRadial2: string;
  bgRadial3: string;
  bgLinearFrom: string;
  bgLinearMid: string;
  bgLinearTo: string;

  // Glass tints
  frameTint: string;
  panelTint: string;
  glassBorder: string;
  glassPanelStrong: string;
  glassBorderStrong: string;

  // Core UI colors
  appBg: string;
  appFg: string;

  // Terminal ANSI palette
  termForeground: string;
  termCursor: string;
  termSelection: string;
  termBlack: string;
  termRed: string;
  termGreen: string;
  termYellow: string;
  termBlue: string;
  termMagenta: string;
  termCyan: string;
  termWhite: string;
  termBrightBlack: string;
  termBrightRed: string;
  termBrightGreen: string;
  termBrightYellow: string;
  termBrightBlue: string;
  termBrightMagenta: string;
  termBrightCyan: string;
  termBrightWhite: string;
}

/* ── Tokyo Night ───────────────────────────────────────── */
const tokyoNight: ShepTheme = {
  id: "tokyo-night",
  name: "Tokyo Night",

  bgRadial1: "rgba(122, 162, 247, 0.10)",
  bgRadial2: "rgba(187, 154, 247, 0.06)",
  bgRadial3: "rgba(125, 207, 255, 0.06)",
  bgLinearFrom: "#16161e",
  bgLinearMid: "#1a1b26",
  bgLinearTo: "#16161e",

  frameTint: "rgba(22, 22, 30, 0.30)",
  panelTint: "rgba(26, 27, 38, 0.52)",
  glassBorder: "rgba(169, 177, 214, 0.12)",
  glassPanelStrong: "rgba(22, 22, 30, 0.78)",
  glassBorderStrong: "rgba(169, 177, 214, 0.18)",

  appBg: "#1a1b26",
  appFg: "#a9b1d6",

  termForeground: "#a9b1d6",
  termCursor: "#c0caf5",
  termSelection: "#515c7e4d",
  termBlack: "#363b54",
  termRed: "#f7768e",
  termGreen: "#73daca",
  termYellow: "#e0af68",
  termBlue: "#7aa2f7",
  termMagenta: "#bb9af7",
  termCyan: "#7dcfff",
  termWhite: "#787c99",
  termBrightBlack: "#363b54",
  termBrightRed: "#f7768e",
  termBrightGreen: "#73daca",
  termBrightYellow: "#e0af68",
  termBrightBlue: "#7aa2f7",
  termBrightMagenta: "#bb9af7",
  termBrightCyan: "#7dcfff",
  termBrightWhite: "#acb0d0",
};

/* ── Monokai ───────────────────────────────────────────── */
const monokai: ShepTheme = {
  id: "monokai",
  name: "Monokai",

  bgRadial1: "rgba(249, 38, 114, 0.08)",
  bgRadial2: "rgba(166, 226, 46, 0.05)",
  bgRadial3: "rgba(230, 219, 116, 0.05)",
  bgLinearFrom: "#1e1f1c",
  bgLinearMid: "#272822",
  bgLinearTo: "#1e1f1c",

  frameTint: "rgba(30, 31, 28, 0.32)",
  panelTint: "rgba(39, 40, 34, 0.55)",
  glassBorder: "rgba(117, 113, 94, 0.14)",
  glassPanelStrong: "rgba(30, 31, 28, 0.80)",
  glassBorderStrong: "rgba(117, 113, 94, 0.20)",

  appBg: "#272822",
  appFg: "#f8f8f2",

  termForeground: "#f8f8f2",
  termCursor: "#f8f8f0",
  termSelection: "#49483e",
  termBlack: "#272822",
  termRed: "#f92672",
  termGreen: "#a6e22e",
  termYellow: "#e6db74",
  termBlue: "#66d9ef",
  termMagenta: "#ae81ff",
  termCyan: "#a1efe4",
  termWhite: "#f8f8f2",
  termBrightBlack: "#75715e",
  termBrightRed: "#f92672",
  termBrightGreen: "#a6e22e",
  termBrightYellow: "#e6db74",
  termBrightBlue: "#66d9ef",
  termBrightMagenta: "#ae81ff",
  termBrightCyan: "#a1efe4",
  termBrightWhite: "#f9f8f5",
};

/* ── Dracula ───────────────────────────────────────────── */
const dracula: ShepTheme = {
  id: "dracula",
  name: "Dracula",

  bgRadial1: "rgba(189, 147, 249, 0.08)",
  bgRadial2: "rgba(255, 121, 198, 0.05)",
  bgRadial3: "rgba(139, 233, 253, 0.05)",
  bgLinearFrom: "#21222c",
  bgLinearMid: "#282a36",
  bgLinearTo: "#21222c",

  frameTint: "rgba(33, 34, 44, 0.30)",
  panelTint: "rgba(40, 42, 54, 0.52)",
  glassBorder: "rgba(98, 114, 164, 0.14)",
  glassPanelStrong: "rgba(33, 34, 44, 0.78)",
  glassBorderStrong: "rgba(98, 114, 164, 0.20)",

  appBg: "#282a36",
  appFg: "#f8f8f2",

  termForeground: "#f8f8f2",
  termCursor: "#f8f8f2",
  termSelection: "#44475a",
  termBlack: "#21222c",
  termRed: "#ff5555",
  termGreen: "#50fa7b",
  termYellow: "#f1fa8c",
  termBlue: "#bd93f9",
  termMagenta: "#ff79c6",
  termCyan: "#8be9fd",
  termWhite: "#f8f8f2",
  termBrightBlack: "#6272a4",
  termBrightRed: "#ff6e6e",
  termBrightGreen: "#69ff94",
  termBrightYellow: "#ffffa5",
  termBrightBlue: "#d6acff",
  termBrightMagenta: "#ff92df",
  termBrightCyan: "#a4ffff",
  termBrightWhite: "#ffffff",
};

/* ── Glass ─────────────────────────────────────────────── */
const glass: ShepTheme = {
  id: "glass",
  name: "Glass",

  bgRadial1: "rgba(130, 160, 220, 0.18)",
  bgRadial2: "rgba(160, 120, 230, 0.16)",
  bgRadial3: "rgba(100, 210, 220, 0.16)",
  bgLinearFrom: "#0a0b12",
  bgLinearMid: "#0e0f18",
  bgLinearTo: "#0a0b12",

  frameTint: "rgba(14, 15, 24, 0.08)",
  panelTint: "rgba(14, 15, 24, 0.15)",
  glassBorder: "rgba(160, 180, 230, 0.22)",
  glassPanelStrong: "rgba(14, 15, 24, 0.52)",
  glassBorderStrong: "rgba(160, 180, 230, 0.28)",

  appBg: "#0e0f18",
  appFg: "#b8c4e0",

  termForeground: "#b8c4e0",
  termCursor: "#88aaff",
  termSelection: "#4455884d",
  termBlack: "#2a2e3c",
  termRed: "#f07088",
  termGreen: "#78ddb8",
  termYellow: "#e0b870",
  termBlue: "#7aa8f8",
  termMagenta: "#c090f0",
  termCyan: "#70c8e0",
  termWhite: "#9aa0b8",
  termBrightBlack: "#4a5068",
  termBrightRed: "#f58898",
  termBrightGreen: "#90e8c8",
  termBrightYellow: "#e8c888",
  termBrightBlue: "#90b8ff",
  termBrightMagenta: "#d0a8f8",
  termBrightCyan: "#88d8f0",
  termBrightWhite: "#d0d8e8",
};

export const THEMES: Record<string, ShepTheme> = {
  "tokyo-night": tokyoNight,
  monokai,
  dracula,
  glass,
};

export const THEME_LIST: ShepTheme[] = Object.values(THEMES);

export const DEFAULT_THEME_ID = "tokyo-night";

export function getThemeById(id: string): ShepTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
