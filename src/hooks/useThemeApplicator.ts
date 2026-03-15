import { useEffect } from "react";
import { getCurrentWindow, Effect, EffectState } from "@tauri-apps/api/window";
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
  ["frameTint", "--frame-tint"],
  ["panelTint", "--panel-tint"],
  ["glassBorder", "--glass-border"],
  ["glassPanelStrong", "--glass-panel-strong"],
  ["glassBorderStrong", "--glass-border-strong"],
  ["statusRunning", "--status-running"],
  ["statusStopped", "--status-stopped"],
  ["statusCrashed", "--status-crashed"],
  ["statusAttention", "--status-attention"],
];

export function useThemeApplicator(): void {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const style = document.documentElement.style;
    for (const [key, cssVar] of CSS_VAR_MAP) {
      style.setProperty(cssVar, theme[key] as string);
    }

    // Derive UI text colors from terminal palette
    style.setProperty("--text-primary", theme.termBrightWhite);
    style.setProperty("--text-secondary", theme.termWhite);
    style.setProperty("--text-muted", `color-mix(in srgb, ${theme.termBrightWhite}, transparent 45%)`);

    applyThemeToTerminals(theme);

    const win = getCurrentWindow();
    if (theme.isTransparent) {
      document.body.classList.add("theme-clear");
      win.setEffects({
        effects: [Effect.HudWindow],
        state: EffectState.Active,
      });
    } else {
      document.body.classList.remove("theme-clear");
      win.clearEffects();
    }
  }, [theme]);
}
