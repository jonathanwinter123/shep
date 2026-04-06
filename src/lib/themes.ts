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

/* ── Pandas Dark ──────────────────────────────────────── */
const pandas: ShepTheme = {
  id: "pandas",
  name: "Pandas",
  isTransparent: false,

  bgRadial1: "rgba(69, 169, 249, 0.08)",
  bgRadial2: "rgba(255, 117, 181, 0.06)",
  bgRadial3: "rgba(176, 132, 235, 0.05)",

  bgLinearFrom: "#212223",
  bgLinearMid: "#292a2b",
  bgLinearTo: "#212223",

  frameTint: "#292a2b",
  panelTint: "rgba(41, 42, 43, 0.60)",
  glassBorder: "rgba(204, 204, 204, 0.12)",
  glassPanelStrong: "rgba(41, 42, 43, 0.78)",
  glassBorderStrong: "rgba(204, 204, 204, 0.18)",

  statusRunning: "#45a9f9",
  statusStopped: "#757575",
  statusCrashed: "#ff2c6d",
  statusAttention: "#ffb86c",

  appBg: "#292a2b",
  appFg: "#cccccc",

  termForeground: "#cccccc",
  termCursor: "#cccccc",
  termSelection: "#5f4e3b",
  termBlack: "#000000",
  termRed: "#ff2c6d",
  termGreen: "#19f9d8",
  termYellow: "#ffb86c",
  termBlue: "#45a9f9",
  termMagenta: "#ff75b5",
  termCyan: "#b084eb",
  termWhite: "#cdcdcd",
  termBrightBlack: "#757575",
  termBrightRed: "#ff2c6d",
  termBrightGreen: "#19f9d8",
  termBrightYellow: "#ffcc95",
  termBrightBlue: "#6fc1ff",
  termBrightMagenta: "#ff9ac1",
  termBrightCyan: "#bcaafe",
  termBrightWhite: "#e6e6e6",
};

/* ── Jellybeans Dark ──────────────────────────────────── */
const jellybeans: ShepTheme = {
  id: "jellybeans",
  name: "Jellybeans",
  isTransparent: false,

  bgRadial1: "rgba(151, 190, 220, 0.08)",
  bgRadial2: "rgba(225, 192, 250, 0.06)",
  bgRadial3: "rgba(0, 152, 142, 0.05)",

  bgLinearFrom: "#0a0a0a",
  bgLinearMid: "#121212",
  bgLinearTo: "#0a0a0a",

  frameTint: "#121212",
  panelTint: "rgba(18, 18, 18, 0.60)",
  glassBorder: "rgba(222, 222, 222, 0.12)",
  glassPanelStrong: "rgba(18, 18, 18, 0.78)",
  glassBorderStrong: "rgba(222, 222, 222, 0.18)",

  statusRunning: "#97bedc",
  statusStopped: "#929292",
  statusCrashed: "#e27373",
  statusAttention: "#ffba7b",

  appBg: "#121212",
  appFg: "#dedede",

  termForeground: "#dedede",
  termCursor: "#ffa560",
  termSelection: "#474e91",
  termBlack: "#929292",
  termRed: "#e27373",
  termGreen: "#94b979",
  termYellow: "#ffba7b",
  termBlue: "#97bedc",
  termMagenta: "#e1c0fa",
  termCyan: "#00988e",
  termWhite: "#dedede",
  termBrightBlack: "#bdbdbd",
  termBrightRed: "#ffa1a1",
  termBrightGreen: "#bddeab",
  termBrightYellow: "#ffdca0",
  termBrightBlue: "#b1d8f6",
  termBrightMagenta: "#fbdaff",
  termBrightCyan: "#1ab2a8",
  termBrightWhite: "#ffffff",
};

/* ── Everforest Dark ──────────────────────────────────── */
const everforestDark: ShepTheme = {
  id: "everforest-dark",
  name: "Everforest Dark",
  isTransparent: false,

  bgRadial1: "rgba(127, 187, 179, 0.08)",
  bgRadial2: "rgba(214, 153, 182, 0.06)",
  bgRadial3: "rgba(131, 192, 146, 0.05)",

  bgLinearFrom: "#252d32",
  bgLinearMid: "#2d353b",
  bgLinearTo: "#252d32",

  frameTint: "#2d353b",
  panelTint: "rgba(45, 53, 59, 0.60)",
  glassBorder: "rgba(211, 198, 170, 0.12)",
  glassPanelStrong: "rgba(45, 53, 59, 0.78)",
  glassBorderStrong: "rgba(211, 198, 170, 0.18)",

  statusRunning: "#7fbbb3",
  statusStopped: "#859289",
  statusCrashed: "#e67e80",
  statusAttention: "#dbbc7f",

  appBg: "#2d353b",
  appFg: "#d3c6aa",

  termForeground: "#d3c6aa",
  termCursor: "#d3c6aa",
  termSelection: "#414b51",
  termBlack: "#343f44",
  termRed: "#e67e80",
  termGreen: "#a7c080",
  termYellow: "#dbbc7f",
  termBlue: "#7fbbb3",
  termMagenta: "#d699b6",
  termCyan: "#83c092",
  termWhite: "#d3c6aa",
  termBrightBlack: "#859289",
  termBrightRed: "#e67e80",
  termBrightGreen: "#a7c080",
  termBrightYellow: "#dbbc7f",
  termBrightBlue: "#7fbbb3",
  termBrightMagenta: "#d699b6",
  termBrightCyan: "#83c092",
  termBrightWhite: "#d3c6aa",
};

/* ── Posterpole Dark ──────────────────────────────────── */
const posterpole: ShepTheme = {
  id: "posterpole",
  name: "Posterpole",
  isTransparent: false,

  bgRadial1: "rgba(108, 127, 147, 0.08)",
  bgRadial2: "rgba(184, 148, 175, 0.06)",
  bgRadial3: "rgba(142, 164, 162, 0.05)",

  bgLinearFrom: "#1e1b22",
  bgLinearMid: "#25222a",
  bgLinearTo: "#1e1b22",

  frameTint: "#25222a",
  panelTint: "rgba(37, 34, 42, 0.60)",
  glassBorder: "rgba(198, 192, 185, 0.12)",
  glassPanelStrong: "rgba(37, 34, 42, 0.78)",
  glassBorderStrong: "rgba(198, 192, 185, 0.18)",

  statusRunning: "#6c7f93",
  statusStopped: "#a5a59c",
  statusCrashed: "#a97070",
  statusAttention: "#cc9166",

  appBg: "#25222a",
  appFg: "#c6c0b9",

  termForeground: "#c6c0b9",
  termCursor: "#c6c0b9",
  termSelection: "#4d4d4d",
  termBlack: "#2c2c30",
  termRed: "#a97070",
  termGreen: "#778c73",
  termYellow: "#cc9166",
  termBlue: "#6c7f93",
  termMagenta: "#b894af",
  termCyan: "#8ea4a2",
  termWhite: "#afa79d",
  termBrightBlack: "#a5a59c",
  termBrightRed: "#bc8f8f",
  termBrightGreen: "#92a38f",
  termBrightYellow: "#d9ac8c",
  termBrightBlue: "#8a99a8",
  termBrightMagenta: "#ccb3c6",
  termBrightCyan: "#aabbba",
  termBrightWhite: "#c6c0b9",
};

/* ── Miasma Dark ──────────────────────────────────────── */
const miasma: ShepTheme = {
  id: "miasma",
  name: "Miasma",
  isTransparent: false,

  bgRadial1: "rgba(120, 130, 75, 0.08)",
  bgRadial2: "rgba(187, 119, 68, 0.06)",
  bgRadial3: "rgba(201, 165, 84, 0.05)",

  bgLinearFrom: "#1a1a1a",
  bgLinearMid: "#222222",
  bgLinearTo: "#1a1a1a",

  frameTint: "#222222",
  panelTint: "rgba(34, 34, 34, 0.60)",
  glassBorder: "rgba(194, 194, 176, 0.12)",
  glassPanelStrong: "rgba(34, 34, 34, 0.78)",
  glassBorderStrong: "rgba(194, 194, 176, 0.18)",

  statusRunning: "#78824b",
  statusStopped: "#666666",
  statusCrashed: "#685742",
  statusAttention: "#b36d43",

  appBg: "#222222",
  appFg: "#c2c2b0",

  termForeground: "#c2c2b0",
  termCursor: "#c7c7c7",
  termSelection: "#e5c47b",
  termBlack: "#000000",
  termRed: "#685742",
  termGreen: "#5f875f",
  termYellow: "#b36d43",
  termBlue: "#78824b",
  termMagenta: "#bb7744",
  termCyan: "#c9a554",
  termWhite: "#d7c483",
  termBrightBlack: "#666666",
  termBrightRed: "#685742",
  termBrightGreen: "#5f875f",
  termBrightYellow: "#b36d43",
  termBrightBlue: "#78824b",
  termBrightMagenta: "#bb7744",
  termBrightCyan: "#c9a554",
  termBrightWhite: "#d7c483",
};

/* ── GitHub Dark ───────────────────────────────────────── */
const githubDark: ShepTheme = {
  id: "github-dark",
  name: "GitHub Dark",
  isTransparent: false,

  bgRadial1: "rgba(88, 166, 255, 0.06)",
  bgRadial2: "rgba(188, 140, 255, 0.04)",
  bgRadial3: "rgba(63, 185, 80, 0.04)",

  bgLinearFrom: "#010409",
  bgLinearMid: "#0d1117",
  bgLinearTo: "#010409",

  frameTint: "#0d1117",
  panelTint: "rgba(13, 17, 23, 0.60)",
  glassBorder: "rgba(48, 54, 61, 0.40)",
  glassPanelStrong: "rgba(13, 17, 23, 0.78)",
  glassBorderStrong: "rgba(48, 54, 61, 0.55)",

  statusRunning: "#58a6ff",
  statusStopped: "#484f58",
  statusCrashed: "#ff7b72",
  statusAttention: "#d29922",

  appBg: "#010409",
  appFg: "#e6edf3",

  termForeground: "#e6edf3",
  termCursor: "#e6edf3",
  termSelection: "#264f78",
  termBlack: "#484f58",
  termRed: "#ff7b72",
  termGreen: "#3fb950",
  termYellow: "#d29922",
  termBlue: "#58a6ff",
  termMagenta: "#bc8cff",
  termCyan: "#39c5cf",
  termWhite: "#b1bac4",
  termBrightBlack: "#6e7681",
  termBrightRed: "#ffa198",
  termBrightGreen: "#56d364",
  termBrightYellow: "#e3b341",
  termBrightBlue: "#79c0ff",
  termBrightMagenta: "#d2a8ff",
  termBrightCyan: "#56d4dd",
  termBrightWhite: "#ffffff",
};

/* ── Noctis Light ─────────────────────────────────────── */
const noctisLight: ShepTheme = {
  id: "noctis-light",
  name: "Noctis Light",
  isTransparent: false,

  bgRadial1: "rgba(0, 148, 240, 0.08)",
  bgRadial2: "rgba(255, 87, 146, 0.05)",
  bgRadial3: "rgba(0, 189, 214, 0.05)",

  bgLinearFrom: "#ece4d1",
  bgLinearMid: "#f6edda",
  bgLinearTo: "#ece4d1",

  frameTint: "#f6edda",
  panelTint: "rgba(246, 237, 218, 0.60)",
  glassBorder: "rgba(0, 86, 97, 0.25)",
  glassPanelStrong: "rgba(246, 237, 218, 0.78)",
  glassBorderStrong: "rgba(0, 86, 97, 0.35)",

  statusRunning: "#0094f0",
  statusStopped: "#8ca6a6",
  statusCrashed: "#e34e1c",
  statusAttention: "#f49725",

  appBg: "#f6edda",
  appFg: "#005661",

  termForeground: "#005661",
  termCursor: "#005661",
  termSelection: "#d4e8e2",
  termBlack: "#003b42",
  termRed: "#e34e1c",
  termGreen: "#00b368",
  termYellow: "#f49725",
  termBlue: "#0094f0",
  termMagenta: "#ff5792",
  termCyan: "#00bdd6",
  termWhite: "#8ca6a6",
  termBrightBlack: "#004d57",
  termBrightRed: "#ff4000",
  termBrightGreen: "#00d17a",
  termBrightYellow: "#ff8c00",
  termBrightBlue: "#0fa3ff",
  termBrightMagenta: "#ff6b9f",
  termBrightCyan: "#00cbe6",
  termBrightWhite: "#bbc3c4",
};

/* ── Everforest Light ─────────────────────────────────── */
const everforestLight: ShepTheme = {
  id: "everforest-light",
  name: "Everforest Light",
  isTransparent: false,

  bgRadial1: "rgba(58, 148, 197, 0.08)",
  bgRadial2: "rgba(223, 105, 186, 0.05)",
  bgRadial3: "rgba(53, 167, 124, 0.05)",

  bgLinearFrom: "#f3edd9",
  bgLinearMid: "#fdf6e3",
  bgLinearTo: "#f3edd9",

  frameTint: "#fdf6e3",
  panelTint: "rgba(253, 246, 227, 0.60)",
  glassBorder: "rgba(92, 106, 114, 0.25)",
  glassPanelStrong: "rgba(253, 246, 227, 0.78)",
  glassBorderStrong: "rgba(92, 106, 114, 0.35)",

  statusRunning: "#3a94c5",
  statusStopped: "#939f91",
  statusCrashed: "#f85552",
  statusAttention: "#dfa000",

  appBg: "#fdf6e3",
  appFg: "#5c6a72",

  termForeground: "#5c6a72",
  termCursor: "#5c6a72",
  termSelection: "#efe9d5",
  termBlack: "#5c6a72",
  termRed: "#f85552",
  termGreen: "#8da101",
  termYellow: "#dfa000",
  termBlue: "#3a94c5",
  termMagenta: "#df69ba",
  termCyan: "#35a77c",
  termWhite: "#939f91",
  termBrightBlack: "#5c6a72",
  termBrightRed: "#f85552",
  termBrightGreen: "#8da101",
  termBrightYellow: "#dfa000",
  termBrightBlue: "#3a94c5",
  termBrightMagenta: "#df69ba",
  termBrightCyan: "#35a77c",
  termBrightWhite: "#f4f0d9",
};

/* ── GitHub Light ─────────────────────────────────────── */
const githubLight: ShepTheme = {
  id: "github-light",
  name: "GitHub Light",
  isTransparent: false,

  bgRadial1: "rgba(9, 105, 218, 0.08)",
  bgRadial2: "rgba(130, 80, 223, 0.05)",
  bgRadial3: "rgba(27, 124, 131, 0.05)",

  bgLinearFrom: "#eceef1",
  bgLinearMid: "#f6f8fa",
  bgLinearTo: "#eceef1",

  frameTint: "#f6f8fa",
  panelTint: "rgba(246, 248, 250, 0.60)",
  glassBorder: "rgba(31, 35, 40, 0.25)",
  glassPanelStrong: "rgba(246, 248, 250, 0.78)",
  glassBorderStrong: "rgba(31, 35, 40, 0.35)",

  statusRunning: "#0969da",
  statusStopped: "#57606a",
  statusCrashed: "#cf222e",
  statusAttention: "#4d2d00",

  appBg: "#f6f8fa",
  appFg: "#1f2328",

  termForeground: "#1f2328",
  termCursor: "#1f2328",
  termSelection: "#264f78",
  termBlack: "#24292f",
  termRed: "#cf222e",
  termGreen: "#116329",
  termYellow: "#4d2d00",
  termBlue: "#0969da",
  termMagenta: "#8250df",
  termCyan: "#1b7c83",
  termWhite: "#6e7781",
  termBrightBlack: "#57606a",
  termBrightRed: "#a40e26",
  termBrightGreen: "#1a7f37",
  termBrightYellow: "#633c01",
  termBrightBlue: "#218bff",
  termBrightMagenta: "#a475f9",
  termBrightCyan: "#3192aa",
  termBrightWhite: "#8c959f",
};

/* ── Catppuccin Latte ─────────────────────────────────── */
const catppuccinLatte: ShepTheme = {
  id: "catppuccin-latte",
  name: "Catppuccin Light",
  isTransparent: false,

  bgRadial1: "rgba(30, 102, 245, 0.08)",
  bgRadial2: "rgba(234, 118, 203, 0.05)",
  bgRadial3: "rgba(23, 146, 153, 0.05)",

  bgLinearFrom: "#e6e8ec",
  bgLinearMid: "#eff1f5",
  bgLinearTo: "#e6e8ec",

  frameTint: "#eff1f5",
  panelTint: "rgba(239, 241, 245, 0.60)",
  glassBorder: "rgba(76, 79, 105, 0.25)",
  glassPanelStrong: "rgba(239, 241, 245, 0.78)",
  glassBorderStrong: "rgba(76, 79, 105, 0.35)",

  statusRunning: "#1e66f5",
  statusStopped: "#6c6f85",
  statusCrashed: "#d20f39",
  statusAttention: "#df8e1d",

  appBg: "#eff1f5",
  appFg: "#4c4f69",

  termForeground: "#4c4f69",
  termCursor: "#dc8a78",
  termSelection: "#d8dae1",
  termBlack: "#5c5f77",
  termRed: "#d20f39",
  termGreen: "#40a02b",
  termYellow: "#df8e1d",
  termBlue: "#1e66f5",
  termMagenta: "#ea76cb",
  termCyan: "#179299",
  termWhite: "#acb0be",
  termBrightBlack: "#6c6f85",
  termBrightRed: "#de293e",
  termBrightGreen: "#49af3d",
  termBrightYellow: "#eea02d",
  termBrightBlue: "#456eff",
  termBrightMagenta: "#fe85d8",
  termBrightCyan: "#2d9fa8",
  termBrightWhite: "#bcc0cc",
};

/* ── Nightfox Light ───────────────────────────────────── */
const nightfoxLight: ShepTheme = {
  id: "nightfox-light",
  name: "Nightfox Light",
  isTransparent: false,

  bgRadial1: "rgba(40, 72, 169, 0.08)",
  bgRadial2: "rgba(110, 51, 206, 0.05)",
  bgRadial3: "rgba(40, 121, 128, 0.05)",

  bgLinearFrom: "#ede6e0",
  bgLinearMid: "#f6f2ee",
  bgLinearTo: "#ede6e0",

  frameTint: "#f6f2ee",
  panelTint: "rgba(246, 242, 238, 0.60)",
  glassBorder: "rgba(61, 43, 90, 0.25)",
  glassPanelStrong: "rgba(246, 242, 238, 0.78)",
  glassBorderStrong: "rgba(61, 43, 90, 0.35)",

  statusRunning: "#2848a9",
  statusStopped: "#534c45",
  statusCrashed: "#a5222f",
  statusAttention: "#ac5402",

  appBg: "#f6f2ee",
  appFg: "#3d2b5a",

  termForeground: "#3d2b5a",
  termCursor: "#3d2b5a",
  termSelection: "#e7d2be",
  termBlack: "#352c24",
  termRed: "#a5222f",
  termGreen: "#396847",
  termYellow: "#ac5402",
  termBlue: "#2848a9",
  termMagenta: "#6e33ce",
  termCyan: "#287980",
  termWhite: "#f2e9e1",
  termBrightBlack: "#534c45",
  termBrightRed: "#b3434e",
  termBrightGreen: "#577f63",
  termBrightYellow: "#b86e28",
  termBrightBlue: "#4863b6",
  termBrightMagenta: "#8452d5",
  termBrightCyan: "#488d93",
  termBrightWhite: "#f4ece6",
};

export const THEMES: Record<string, ShepTheme> = {
  catppuccin,
  "tokyo-night": tokyoNight,
  dracula,
  pandas,
  jellybeans,
  "everforest-dark": everforestDark,
  posterpole,
  miasma,
  "github-dark": githubDark,
  clear,
  "catppuccin-latte": catppuccinLatte,
  "everforest-light": everforestLight,
  "nightfox-light": nightfoxLight,
  "noctis-light": noctisLight,
  "github-light": githubLight,
};

export const THEME_LIST: ShepTheme[] = Object.values(THEMES);

/** Relative luminance of a hex color (0 = black, 1 = white) */
function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export const DARK_THEMES: ShepTheme[] = THEME_LIST.filter((t) => hexLuminance(t.appBg) <= 0.3);
export const LIGHT_THEMES: ShepTheme[] = THEME_LIST.filter((t) => hexLuminance(t.appBg) > 0.3);

export const DEFAULT_THEME_ID = "catppuccin";

export function getThemeById(id: string): ShepTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
