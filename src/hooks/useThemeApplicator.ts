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

/** Relative luminance of a hex color (0 = black, 1 = white) */
function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function useThemeApplicator(): void {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const style = document.documentElement.style;
    for (const [key, cssVar] of CSS_VAR_MAP) {
      style.setProperty(cssVar, theme[key] as string);
    }

    // Overlay color: white for dark themes, black for light themes
    const isLight = hexLuminance(theme.appBg) > 0.3;
    style.setProperty("--overlay", isLight ? "#000000" : "#ffffff");
    style.setProperty("--bg-mix-edge", isLight ? "8%" : "30%");
    style.setProperty("--bg-mix-mid", isLight ? "4%" : "20%");
    document.documentElement.style.setProperty(
      "color-scheme",
      isLight ? "light" : "dark",
    );

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
