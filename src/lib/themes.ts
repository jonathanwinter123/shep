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

const suffolk: ShepTheme = {
  id: "suffolk",
  name: "Suffolk",

  bgRadial1: "rgba(150, 165, 200, 0.10)",
  bgRadial2: "rgba(150, 180, 175, 0.06)",
  bgRadial3: "rgba(170, 165, 195, 0.06)",
  bgLinearFrom: "#16161e",
  bgLinearMid: "#1a1b26",
  bgLinearTo: "#16161e",

  ambientOrb1: "rgba(150, 165, 200, 0.10)",
  ambientOrb2: "rgba(150, 180, 175, 0.07)",
  ambientOrb3: "rgba(170, 165, 195, 0.06)",

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

const jacob: ShepTheme = {
  id: "jacob",
  name: "Jacob",

  bgRadial1: "rgba(170, 165, 195, 0.04)",
  bgRadial2: "rgba(150, 180, 165, 0.02)",
  bgRadial3: "rgba(190, 165, 175, 0.02)",
  bgLinearFrom: "#09090e",
  bgLinearMid: "#0e0f14",
  bgLinearTo: "#09090e",

  ambientOrb1: "rgba(170, 165, 195, 0.04)",
  ambientOrb2: "rgba(150, 180, 165, 0.02)",
  ambientOrb3: "rgba(190, 165, 175, 0.02)",

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

const merino: ShepTheme = {
  id: "merino",
  name: "Merino",

  bgRadial1: "rgba(150, 170, 200, 0.12)",
  bgRadial2: "rgba(160, 175, 155, 0.08)",
  bgRadial3: "rgba(190, 160, 165, 0.08)",
  bgLinearFrom: "#1b1f27",
  bgLinearMid: "#21252b",
  bgLinearTo: "#282c34",

  ambientOrb1: "rgba(150, 170, 200, 0.12)",
  ambientOrb2: "rgba(160, 175, 155, 0.08)",
  ambientOrb3: "rgba(190, 160, 165, 0.08)",

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

const cheviot: ShepTheme = {
  id: "cheviot",
  name: "Cheviot",

  bgRadial1: "rgba(160, 170, 195, 0.08)",
  bgRadial2: "rgba(160, 180, 165, 0.06)",
  bgRadial3: "rgba(185, 165, 175, 0.06)",
  bgLinearFrom: "#363c4a",
  bgLinearMid: "#3d4452",
  bgLinearTo: "#363c4a",

  ambientOrb1: "rgba(160, 170, 195, 0.10)",
  ambientOrb2: "rgba(160, 180, 165, 0.07)",
  ambientOrb3: "rgba(185, 165, 175, 0.07)",

  frameTint: "rgba(54, 60, 74, 0.30)",
  panelTint: "rgba(61, 68, 82, 0.52)",
  glassBorder: "rgba(200, 210, 230, 0.14)",

  appBg: "#3d4452",
  appFg: "#c8cdd8",

  termForeground: "#c8cdd8",
  termCursor: "#7aafff",
  termSelection: "#5a658080",
  termBlack: "#363c4a",
  termRed: "#f07080",
  termGreen: "#85d4a0",
  termYellow: "#e8c070",
  termBlue: "#7aafff",
  termMagenta: "#c48dea",
  termCyan: "#70c8d8",
  termWhite: "#c8cdd8",
  termBrightBlack: "#5a6580",
  termBrightRed: "#f59098",
  termBrightGreen: "#a0e0b8",
  termBrightYellow: "#f0d090",
  termBrightBlue: "#98c4ff",
  termBrightMagenta: "#d4a8f0",
  termBrightCyan: "#90d8e8",
  termBrightWhite: "#e0e4ec",
};

export const THEMES: Record<string, ShepTheme> = {
  merino,
  suffolk,
  jacob,
  cheviot,
};

export const THEME_LIST: ShepTheme[] = Object.values(THEMES);

export const DEFAULT_THEME_ID = "merino";

export function getThemeById(id: string): ShepTheme {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
