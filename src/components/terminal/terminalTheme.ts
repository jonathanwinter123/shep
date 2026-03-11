import type { ITheme } from "@xterm/xterm";
import type { ShepTheme } from "../../lib/themes";
import { terminalCache } from "./TerminalView";

// Utility to make hex colors partially transparent
function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith("#") && (hex.length === 7 || hex.length === 9)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function createTerminalTheme(theme: ShepTheme): ITheme {
  return {
    background: "transparent",
    foreground: theme.termForeground,
    cursor: theme.termCursor,
    selectionBackground: theme.termSelection,
    black: withAlpha(theme.termBlack, 0.4),
    red: theme.termRed,
    green: theme.termGreen,
    yellow: theme.termYellow,
    blue: theme.termBlue,
    magenta: theme.termMagenta,
    cyan: theme.termCyan,
    white: theme.termWhite,
    brightBlack: withAlpha(theme.termBrightBlack, 0.4),
    brightRed: theme.termBrightRed,
    brightGreen: theme.termBrightGreen,
    brightYellow: theme.termBrightYellow,
    brightBlue: theme.termBrightBlue,
    brightMagenta: theme.termBrightMagenta,
    brightCyan: theme.termBrightCyan,
    brightWhite: theme.termBrightWhite,
  };
}

export function applyThemeToTerminals(theme: ShepTheme): void {
  const xtermTheme = createTerminalTheme(theme);
  for (const [, entry] of terminalCache) {
    entry.term.options.theme = xtermTheme;
    entry.term.refresh(0, entry.term.rows - 1);
  }
}
