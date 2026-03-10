import { useEffect } from "react";
import { useThemeStore } from "../stores/useThemeStore";
import { applyThemeToTerminals } from "../components/terminal/terminalTheme";
import type { ShepTheme } from "../lib/themes";

const CSS_VAR_MAP: [keyof ShepTheme, string][] = [
  ["appBg", "--app-bg"],
  ["appFg", "--app-fg"],
  ["bgRadial1", "--bg-radial-1"],
  ["bgRadial2", "--bg-radial-2"],
  ["bgRadial3", "--bg-radial-3"],
  ["bgLinearFrom", "--bg-linear-from"],
  ["bgLinearMid", "--bg-linear-mid"],
  ["bgLinearTo", "--bg-linear-to"],
  ["ambientOrb1", "--ambient-orb-1"],
  ["ambientOrb2", "--ambient-orb-2"],
  ["ambientOrb3", "--ambient-orb-3"],
  ["frameTint", "--frame-tint"],
  ["panelTint", "--panel-tint"],
  ["glassBorder", "--glass-border"],
];

export function useThemeApplicator(): void {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const style = document.documentElement.style;
    for (const [key, cssVar] of CSS_VAR_MAP) {
      style.setProperty(cssVar, theme[key]);
    }
    applyThemeToTerminals(theme);
  }, [theme]);
}
