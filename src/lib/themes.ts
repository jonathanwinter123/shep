export interface ShepTheme {
  id: string;
  name: string;
  isTransparent: boolean;

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

  // Status indicators
  statusRunning: string;
  statusStopped: string;
  statusCrashed: string;
  statusAttention: string;

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
  isTransparent: false,

  bgRadial1: "rgba(122, 162, 247, 0.10)",
  bgRadial2: "rgba(187, 154, 247, 0.06)",
  bgRadial3: "rgba(125, 207, 255, 0.06)",
  bgLinearFrom: "#13141c",
  bgLinearMid: "#16171f",
  bgLinearTo: "#13141c",

  frameTint: "#1a1b26",
  panelTint: "rgba(26, 27, 38, 0.60)",
  glassBorder: "rgba(169, 177, 214, 0.12)",
  glassPanelStrong: "rgba(22, 22, 30, 0.78)",
  glassBorderStrong: "rgba(169, 177, 214, 0.18)",

  statusRunning: "#7aa2f7",
  statusStopped: "#414868",
  statusCrashed: "#f7768e",
  statusAttention: "#e0af68",

  appBg: "#1a1b26",
  appFg: "#c0caf5",

  termForeground: "#c0caf5",
  termCursor: "#c0caf5",
  termSelection: "#283457",
  termBlack: "#15161e",
  termRed: "#f7768e",
  termGreen: "#9ece6a",
  termYellow: "#e0af68",
  termBlue: "#7aa2f7",
  termMagenta: "#bb9af7",
  termCyan: "#7dcfff",
  termWhite: "#a9b1d6",
  termBrightBlack: "#414868",
  termBrightRed: "#f7768e",
  termBrightGreen: "#9ece6a",
  termBrightYellow: "#e0af68",
  termBrightBlue: "#7aa2f7",
  termBrightMagenta: "#bb9af7",
  termBrightCyan: "#7dcfff",
  termBrightWhite: "#c0caf5",
};

/* ── Monokai ───────────────────────────────────────────── */
const monokai: ShepTheme = {
  id: "monokai",
  name: "Monokai",
  isTransparent: false,

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

  statusRunning: "#66d9ef",
  statusStopped: "#75715e",
  statusCrashed: "#f92672",
  statusAttention: "#e6db74",

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
  isTransparent: false,

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

  statusRunning: "#8be9fd",
  statusStopped: "#6272a4",
  statusCrashed: "#ff5555",
  statusAttention: "#f1fa8c",

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

/* ── Clear ─────────────────────────────────────────────── */
const clear: ShepTheme = {
  id: "clear",
  name: "Clear",
  isTransparent: true,

  bgRadial1: "rgba(120, 160, 240, 0.08)",
  bgRadial2: "rgba(140, 100, 220, 0.06)",
  bgRadial3: "rgba(80, 180, 220, 0.06)",
  bgLinearFrom: "rgba(12, 18, 35, 0.30)",
  bgLinearMid: "rgba(12, 18, 35, 0.22)",
  bgLinearTo: "rgba(12, 18, 35, 0.30)",

  frameTint: "rgba(12, 18, 35, 0.10)",
  panelTint: "rgba(12, 18, 35, 0.14)",
  glassBorder: "rgba(160, 185, 240, 0.12)",
  glassPanelStrong: "rgba(12, 18, 35, 0.40)",
  glassBorderStrong: "rgba(160, 185, 240, 0.16)",

  statusRunning: "#60c0e0",
  statusStopped: "#384058",
  statusCrashed: "#e06080",
  statusAttention: "#c8a050",

  appBg: "#0c1223",
  appFg: "#c0ccdf",

  termForeground: "#c0ccdf",
  termCursor: "#90b0ff",
  termSelection: "#4466994d",
  termBlack: "#2a3040",
  termRed: "#f27088",
  termGreen: "#6cd4b0",
  termYellow: "#ddb870",
  termBlue: "#7ca8f0",
  termMagenta: "#b890e8",
  termCyan: "#6cc8d8",
  termWhite: "#98a0b8",
  termBrightBlack: "#485068",
  termBrightRed: "#f88898",
  termBrightGreen: "#88e0c0",
  termBrightYellow: "#e8c888",
  termBrightBlue: "#98b8ff",
  termBrightMagenta: "#cca8f0",
  termBrightCyan: "#88d8e8",
  termBrightWhite: "#d8e0f0",
};

export const THEMES: Record<string, ShepTheme> = {
  "tokyo-night": tokyoNight,
  monokai,
  dracula,
  clear,
};

export const THEME_LIST: ShepTheme[] = Object.values(THEMES);

export const DEFAULT_THEME_ID = "tokyo-night";

export function getThemeById(id: string): ShepTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
