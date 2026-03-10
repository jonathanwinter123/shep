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

const jacob: ShepTheme = {
  id: "jacob",
  name: "Jacob",

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

const merino: ShepTheme = {
  id: "merino",
  name: "Merino",

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

const cheviot: ShepTheme = {
  id: "cheviot",
  name: "Cheviot",

  bgRadial1: "rgba(100, 140, 200, 0.08)",
  bgRadial2: "rgba(120, 180, 140, 0.06)",
  bgRadial3: "rgba(180, 120, 140, 0.06)",
  bgLinearFrom: "#dcdee3",
  bgLinearMid: "#e4e6eb",
  bgLinearTo: "#dcdee3",

  ambientOrb1: "rgba(100, 140, 200, 0.10)",
  ambientOrb2: "rgba(120, 180, 140, 0.08)",
  ambientOrb3: "rgba(180, 120, 140, 0.08)",

  frameTint: "rgba(255, 255, 255, 0.50)",
  panelTint: "rgba(255, 255, 255, 0.60)",
  glassBorder: "rgba(0, 0, 0, 0.10)",

  appBg: "#e4e6eb",
  appFg: "#2e3135",

  termForeground: "#2e3135",
  termCursor: "#526eff",
  termSelection: "rgba(0, 80, 180, 0.20)",
  termBlack: "#2e3135",
  termRed: "#c4352a",
  termGreen: "#357a38",
  termYellow: "#a67c1a",
  termBlue: "#2a6cdb",
  termMagenta: "#9c40b0",
  termCyan: "#1a8a8a",
  termWhite: "#d0d0d0",
  termBrightBlack: "#5c6370",
  termBrightRed: "#e05252",
  termBrightGreen: "#48a84c",
  termBrightYellow: "#c29020",
  termBrightBlue: "#4888f0",
  termBrightMagenta: "#b460cc",
  termBrightCyan: "#20a5a5",
  termBrightWhite: "#f0f0f0",
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
