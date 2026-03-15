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

/* ── Ayu Dark ─────────────────────────────────────────── */
const ayu: ShepTheme = {
  id: "ayu",
  name: "Ayu Dark",
  isTransparent: false,

  bgRadial1: "rgba(83, 189, 250, 0.08)",
  bgRadial2: "rgba(205, 161, 250, 0.05)",
  bgRadial3: "rgba(144, 225, 198, 0.05)",

  bgLinearFrom: "#080a10",
  bgLinearMid: "#0b0e14",
  bgLinearTo: "#080a10",

  frameTint: "#0b0e14",
  panelTint: "rgba(11, 14, 20, 0.60)",
  glassBorder: "rgba(191, 189, 182, 0.12)",
  glassPanelStrong: "rgba(11, 14, 20, 0.78)",
  glassBorderStrong: "rgba(191, 189, 182, 0.18)",

  statusRunning: "#53bdfa",
  statusStopped: "#686868",
  statusCrashed: "#ea6c73",
  statusAttention: "#f9af4f",

  appBg: "#0b0e14",
  appFg: "#bfbdb6",

  termForeground: "#bfbdb6",
  termCursor: "#bfbdb6",
  termSelection: "#1b3a5b",
  termBlack: "#1e232b",
  termRed: "#ea6c73",
  termGreen: "#7fd962",
  termYellow: "#f9af4f",
  termBlue: "#53bdfa",
  termMagenta: "#cda1fa",
  termCyan: "#90e1c6",
  termWhite: "#c7c7c7",
  termBrightBlack: "#686868",
  termBrightRed: "#f07178",
  termBrightGreen: "#aad94c",
  termBrightYellow: "#ffb454",
  termBrightBlue: "#59c2ff",
  termBrightMagenta: "#d2a6ff",
  termBrightCyan: "#95e6cb",
  termBrightWhite: "#ffffff",
};

/* ── Dracula ───────────────────────────────────────────── */
const dracula: ShepTheme = {
  id: "dracula",
  name: "Dracula",
  isTransparent: false,

  bgRadial1: "rgba(189, 147, 249, 0.08)",
  bgRadial2: "rgba(255, 121, 198, 0.05)",
  bgRadial3: "rgba(139, 233, 253, 0.05)",
  bgLinearFrom: "#1d1e28",
  bgLinearMid: "#282a36",
  bgLinearTo: "#1d1e28",

  frameTint: "#282a36",
  panelTint: "rgba(40, 42, 54, 0.60)",
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

/* ── Gotham ────────────────────────────────────────────── */
const gotham: ShepTheme = {
  id: "gotham",
  name: "Gotham",
  isTransparent: false,

  bgRadial1: "rgba(51, 133, 158, 0.08)",
  bgRadial2: "rgba(78, 81, 102, 0.06)",
  bgRadial3: "rgba(42, 168, 137, 0.05)",

  bgLinearFrom: "#080c10",
  bgLinearMid: "#0c1014",
  bgLinearTo: "#080c10",

  frameTint: "#0c1014",
  panelTint: "rgba(12, 16, 20, 0.60)",
  glassBorder: "rgba(153, 209, 206, 0.12)",
  glassPanelStrong: "rgba(12, 16, 20, 0.78)",
  glassBorderStrong: "rgba(153, 209, 206, 0.18)",

  statusRunning: "#33859e",
  statusStopped: "#4e5166",
  statusCrashed: "#c23127",
  statusAttention: "#edb443",

  appBg: "#0c1014",
  appFg: "#99d1ce",

  termForeground: "#99d1ce",
  termCursor: "#99d1ce",
  termSelection: "#0a3749",
  termBlack: "#0c1014",
  termRed: "#c23127",
  termGreen: "#2aa889",
  termYellow: "#edb443",
  termBlue: "#195466",
  termMagenta: "#4e5166",
  termCyan: "#33859e",
  termWhite: "#99d1ce",
  termBrightBlack: "#0c1014",
  termBrightRed: "#c23127",
  termBrightGreen: "#2aa889",
  termBrightYellow: "#edb443",
  termBrightBlue: "#195466",
  termBrightMagenta: "#4e5166",
  termBrightCyan: "#33859e",
  termBrightWhite: "#99d1ce",
};

/* ── Catppuccin Mocha ──────────────────────────────────── */
const catppuccin: ShepTheme = {
  id: "catppuccin",
  name: "Catppuccin",
  isTransparent: false,

  bgRadial1: "rgba(137, 180, 250, 0.08)",
  bgRadial2: "rgba(245, 194, 231, 0.05)",
  bgRadial3: "rgba(148, 226, 213, 0.05)",

  bgLinearFrom: "#181825",
  bgLinearMid: "#1e1e2e",
  bgLinearTo: "#181825",

  frameTint: "#1e1e2e",
  panelTint: "rgba(30, 30, 46, 0.60)",
  glassBorder: "rgba(166, 173, 200, 0.12)",
  glassPanelStrong: "rgba(30, 30, 46, 0.78)",
  glassBorderStrong: "rgba(166, 173, 200, 0.18)",

  statusRunning: "#89b4fa",
  statusStopped: "#585b70",
  statusCrashed: "#f38ba8",
  statusAttention: "#f9e2af",

  appBg: "#1e1e2e",
  appFg: "#cdd6f4",

  termForeground: "#cdd6f4",
  termCursor: "#f5e0dc",
  termSelection: "#353748",
  termBlack: "#45475a",
  termRed: "#f38ba8",
  termGreen: "#a6e3a1",
  termYellow: "#f9e2af",
  termBlue: "#89b4fa",
  termMagenta: "#f5c2e7",
  termCyan: "#94e2d5",
  termWhite: "#a6adc8",
  termBrightBlack: "#585b70",
  termBrightRed: "#f37799",
  termBrightGreen: "#89d88b",
  termBrightYellow: "#ebd391",
  termBrightBlue: "#74a8fc",
  termBrightMagenta: "#f2aede",
  termBrightCyan: "#6bd7ca",
  termBrightWhite: "#bac2de",
};

/* ── Kanagawa ──────────────────────────────────────────── */
const kanagawa: ShepTheme = {
  id: "kanagawa",
  name: "Kanagawa",
  isTransparent: false,

  bgRadial1: "rgba(126, 156, 216, 0.08)",
  bgRadial2: "rgba(149, 127, 184, 0.06)",
  bgRadial3: "rgba(106, 149, 137, 0.05)",

  bgLinearFrom: "#1a1a22",
  bgLinearMid: "#1f1f28",
  bgLinearTo: "#1a1a22",

  frameTint: "#1f1f28",
  panelTint: "rgba(31, 31, 40, 0.60)",
  glassBorder: "rgba(200, 192, 147, 0.12)",
  glassPanelStrong: "rgba(31, 31, 40, 0.78)",
  glassBorderStrong: "rgba(200, 192, 147, 0.18)",

  statusRunning: "#7e9cd8",
  statusStopped: "#727169",
  statusCrashed: "#c34043",
  statusAttention: "#c0a36e",

  appBg: "#1f1f28",
  appFg: "#dcd7ba",

  termForeground: "#dcd7ba",
  termCursor: "#dcd7ba",
  termSelection: "#2d4f67",
  termBlack: "#16161d",
  termRed: "#c34043",
  termGreen: "#76946a",
  termYellow: "#c0a36e",
  termBlue: "#7e9cd8",
  termMagenta: "#957fb8",
  termCyan: "#6a9589",
  termWhite: "#c8c093",
  termBrightBlack: "#727169",
  termBrightRed: "#e82424",
  termBrightGreen: "#98bb6c",
  termBrightYellow: "#e6c384",
  termBrightBlue: "#7fb4ca",
  termBrightMagenta: "#938aa9",
  termBrightCyan: "#7aa89f",
  termBrightWhite: "#dcd7ba",
};

/* ── Night Owl ─────────────────────────────────────────── */
const nightOwl: ShepTheme = {
  id: "night-owl",
  name: "Night Owl",
  isTransparent: false,

  bgRadial1: "rgba(130, 170, 255, 0.08)",
  bgRadial2: "rgba(199, 146, 234, 0.05)",
  bgRadial3: "rgba(33, 199, 168, 0.05)",

  bgLinearFrom: "#010f1e",
  bgLinearMid: "#011627",
  bgLinearTo: "#010f1e",

  frameTint: "#011627",
  panelTint: "rgba(1, 22, 39, 0.60)",
  glassBorder: "rgba(204, 204, 204, 0.12)",
  glassPanelStrong: "rgba(1, 22, 39, 0.78)",
  glassBorderStrong: "rgba(204, 204, 204, 0.18)",

  statusRunning: "#82aaff",
  statusStopped: "#575656",
  statusCrashed: "#ef5350",
  statusAttention: "#c5e478",

  appBg: "#011627",
  appFg: "#cccccc",

  termForeground: "#cccccc",
  termCursor: "#cccccc",
  termSelection: "#093b5e",
  termBlack: "#011627",
  termRed: "#ef5350",
  termGreen: "#22da6e",
  termYellow: "#c5e478",
  termBlue: "#82aaff",
  termMagenta: "#c792ea",
  termCyan: "#21c7a8",
  termWhite: "#ffffff",
  termBrightBlack: "#575656",
  termBrightRed: "#ef5350",
  termBrightGreen: "#22da6e",
  termBrightYellow: "#ffeb95",
  termBrightBlue: "#82aaff",
  termBrightMagenta: "#c792ea",
  termBrightCyan: "#7fdbca",
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
  dracula,
  "tokyo-night": tokyoNight,
  ayu,
  gotham,
  catppuccin,
  kanagawa,
  "night-owl": nightOwl,
  clear,
};

export const THEME_LIST: ShepTheme[] = Object.values(THEMES);

export const DEFAULT_THEME_ID = "dracula";

export function getThemeById(id: string): ShepTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
