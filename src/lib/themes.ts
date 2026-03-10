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

  // Ambient orbs
  ambientOrb1: string;
  ambientOrb2: string;
  ambientOrb3: string;

  // Glass tints
  frameTint: string;
  panelTint: string;
  glassBorder: string;

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

const tokyoNight: ShepTheme = {
  id: "tokyo-night",
  name: "Tokyo Night",

  bgRadial1: "rgba(122, 162, 247, 0.18)",
  bgRadial2: "rgba(115, 218, 202, 0.10)",
  bgRadial3: "rgba(187, 154, 247, 0.10)",
  bgLinearFrom: "#16161e",
  bgLinearMid: "#1a1b26",
  bgLinearTo: "#16161e",

  ambientOrb1: "rgba(122, 162, 247, 0.18)",
  ambientOrb2: "rgba(115, 218, 202, 0.12)",
  ambientOrb3: "rgba(187, 154, 247, 0.10)",

  frameTint: "rgba(22, 22, 30, 0.3)",
  panelTint: "rgba(26, 27, 38, 0.52)",
  glassBorder: "rgba(169, 177, 214, 0.12)",

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

const dracula: ShepTheme = {
  id: "dracula",
  name: "Dracula",

  bgRadial1: "rgba(189, 147, 249, 0.05)",
  bgRadial2: "rgba(80, 250, 123, 0.02)",
  bgRadial3: "rgba(255, 121, 198, 0.02)",
  bgLinearFrom: "#09090e",
  bgLinearMid: "#0e0f14",
  bgLinearTo: "#09090e",

  ambientOrb1: "rgba(189, 147, 249, 0.05)",
  ambientOrb2: "rgba(80, 250, 123, 0.03)",
  ambientOrb3: "rgba(255, 79, 198, 0.03)",

  frameTint: "rgba(9, 9, 14, 0.65)",
  panelTint: "rgba(14, 15, 20, 0.80)",
  glassBorder: "rgba(98, 114, 164, 0.20)",

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

const catppuccinMocha: ShepTheme = {
  id: "catppuccin-mocha",
  name: "Catppuccin Mocha",

  bgRadial1: "rgba(137, 180, 250, 0.22)",
  bgRadial2: "rgba(166, 227, 161, 0.14)",
  bgRadial3: "rgba(245, 194, 231, 0.14)",
  bgLinearFrom: "#11111b",
  bgLinearMid: "#181825",
  bgLinearTo: "#1e1e2e",

  ambientOrb1: "rgba(137, 180, 250, 0.24)",
  ambientOrb2: "rgba(148, 226, 213, 0.16)",
  ambientOrb3: "rgba(243, 139, 168, 0.14)",

  frameTint: "rgba(17, 17, 27, 0.3)",
  panelTint: "rgba(24, 24, 37, 0.52)",
  glassBorder: "rgba(205, 214, 244, 0.12)",

  appBg: "#1e1e2e",
  appFg: "#cdd6f4",

  termForeground: "#cdd6f4",
  termCursor: "#f5e0dc",
  termSelection: "#45475a",
  termBlack: "#45475a",
  termRed: "#f38ba8",
  termGreen: "#a6e3a1",
  termYellow: "#f9e2af",
  termBlue: "#89b4fa",
  termMagenta: "#f5c2e7",
  termCyan: "#94e2d5",
  termWhite: "#bac2de",
  termBrightBlack: "#585b70",
  termBrightRed: "#f38ba8",
  termBrightGreen: "#a6e3a1",
  termBrightYellow: "#f9e2af",
  termBrightBlue: "#89b4fa",
  termBrightMagenta: "#f5c2e7",
  termBrightCyan: "#94e2d5",
  termBrightWhite: "#a6adc8",
};

const gruvboxDark: ShepTheme = {
  id: "gruvbox-dark",
  name: "Gruvbox Dark",

  bgRadial1: "rgba(215, 153, 33, 0.20)",
  bgRadial2: "rgba(152, 151, 26, 0.14)",
  bgRadial3: "rgba(204, 36, 29, 0.12)",
  bgLinearFrom: "#1d2021",
  bgLinearMid: "#282828",
  bgLinearTo: "#1d2021",

  ambientOrb1: "rgba(215, 153, 33, 0.22)",
  ambientOrb2: "rgba(184, 187, 38, 0.16)",
  ambientOrb3: "rgba(251, 73, 52, 0.14)",

  frameTint: "rgba(29, 32, 33, 0.3)",
  panelTint: "rgba(40, 40, 40, 0.52)",
  glassBorder: "rgba(235, 219, 178, 0.12)",

  appBg: "#1d2021",
  appFg: "#ebdbb2",

  termForeground: "#ebdbb2",
  termCursor: "#ebdbb2",
  termSelection: "#504945",
  termBlack: "#282828",
  termRed: "#cc241d",
  termGreen: "#98971a",
  termYellow: "#d79921",
  termBlue: "#458588",
  termMagenta: "#b16286",
  termCyan: "#689d6a",
  termWhite: "#a89984",
  termBrightBlack: "#928374",
  termBrightRed: "#fb4934",
  termBrightGreen: "#b8bb26",
  termBrightYellow: "#fabd2f",
  termBrightBlue: "#83a598",
  termBrightMagenta: "#d3869b",
  termBrightCyan: "#8ec07c",
  termBrightWhite: "#ebdbb2",
};

const nord: ShepTheme = {
  id: "nord",
  name: "Nord",

  bgRadial1: "rgba(136, 192, 208, 0.22)",
  bgRadial2: "rgba(163, 190, 140, 0.14)",
  bgRadial3: "rgba(191, 97, 106, 0.12)",
  bgLinearFrom: "#1e2430",
  bgLinearMid: "#242c3a",
  bgLinearTo: "#2e3440",

  ambientOrb1: "rgba(136, 192, 208, 0.24)",
  ambientOrb2: "rgba(163, 190, 140, 0.16)",
  ambientOrb3: "rgba(208, 135, 112, 0.14)",

  frameTint: "rgba(30, 36, 48, 0.3)",
  panelTint: "rgba(46, 52, 64, 0.52)",
  glassBorder: "rgba(216, 222, 233, 0.12)",

  appBg: "#2e3440",
  appFg: "#d8dee9",

  termForeground: "#d8dee9",
  termCursor: "#d8dee9",
  termSelection: "#434c5e",
  termBlack: "#3b4252",
  termRed: "#bf616a",
  termGreen: "#a3be8c",
  termYellow: "#ebcb8b",
  termBlue: "#81a1c1",
  termMagenta: "#b48ead",
  termCyan: "#88c0d0",
  termWhite: "#e5e9f0",
  termBrightBlack: "#4c566a",
  termBrightRed: "#bf616a",
  termBrightGreen: "#a3be8c",
  termBrightYellow: "#ebcb8b",
  termBrightBlue: "#81a1c1",
  termBrightMagenta: "#b48ead",
  termBrightCyan: "#8fbcbb",
  termBrightWhite: "#eceff4",
};

const oneDark: ShepTheme = {
  id: "one-dark",
  name: "One Dark",

  bgRadial1: "rgba(97, 175, 239, 0.22)",
  bgRadial2: "rgba(152, 195, 121, 0.14)",
  bgRadial3: "rgba(224, 108, 117, 0.14)",
  bgLinearFrom: "#1b1f27",
  bgLinearMid: "#21252b",
  bgLinearTo: "#282c34",

  ambientOrb1: "rgba(97, 175, 239, 0.24)",
  ambientOrb2: "rgba(152, 195, 121, 0.16)",
  ambientOrb3: "rgba(224, 108, 117, 0.14)",

  frameTint: "rgba(27, 31, 39, 0.3)",
  panelTint: "rgba(33, 37, 43, 0.52)",
  glassBorder: "rgba(171, 178, 191, 0.12)",

  appBg: "#282c34",
  appFg: "#abb2bf",

  termForeground: "#abb2bf",
  termCursor: "#528bff",
  termSelection: "#3e4451",
  termBlack: "#282c34",
  termRed: "#e06c75",
  termGreen: "#98c379",
  termYellow: "#e5c07b",
  termBlue: "#61afef",
  termMagenta: "#c678dd",
  termCyan: "#56b6c2",
  termWhite: "#abb2bf",
  termBrightBlack: "#5c6370",
  termBrightRed: "#e06c75",
  termBrightGreen: "#98c379",
  termBrightYellow: "#e5c07b",
  termBrightBlue: "#61afef",
  termBrightMagenta: "#c678dd",
  termBrightCyan: "#56b6c2",
  termBrightWhite: "#ffffff",
};

export const THEMES: Record<string, ShepTheme> = {
  "tokyo-night": tokyoNight,
  dracula,
  "catppuccin-mocha": catppuccinMocha,
  "gruvbox-dark": gruvboxDark,
  nord,
  "one-dark": oneDark,
};

export const THEME_LIST: ShepTheme[] = Object.values(THEMES);

export const DEFAULT_THEME_ID = "tokyo-night";

export function getThemeById(id: string): ShepTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
