import type { ITheme } from "@xterm/xterm";
import type { ShepTheme } from "../../lib/themes";
import { terminalCache } from "./TerminalView";

export function createTerminalTheme(theme: ShepTheme): ITheme {
  return {
    background: "transparent",
    foreground: theme.termForeground,
    cursor: theme.termCursor,
    selectionBackground: theme.termSelection,
    black: theme.termBlack,
    red: theme.termRed,
    green: theme.termGreen,
    yellow: theme.termYellow,
    blue: theme.termBlue,
    magenta: theme.termMagenta,
    cyan: theme.termCyan,
    white: theme.termWhite,
    brightBlack: theme.termBrightBlack,
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
