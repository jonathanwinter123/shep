import { useUsageStore } from "../../stores/useUsageStore";
import { useUIStore } from "../../stores/useUIStore";
import type { UsageProvider } from "../../lib/types";
import { getPrimaryWindow, getProviderLabel, formatPercent, formatTokenCount } from "../usage/usageHelpers";
import SectionHeader from "./SectionHeader";

const PROVIDERS: UsageProvider[] = ["codex", "claude", "gemini"];

/** Determine bar color based on 5h usage AND whether it exceeds 7d pacing. */
function barTone(pct5h: number | null | undefined, pct7d: number | null | undefined): string {
  if (pct5h == null) return "local";
  // If short-term usage is outpacing the weekly rate, escalate
  const overPacing = pct7d != null && pct5h > pct7d;
  if (pct5h >= 90) return "critical";
  if (pct5h >= 75 || (overPacing && pct5h >= 50)) return "high";
  if (pct5h >= 50 || overPacing) return "medium";
  return "low";
}

const TONE_COLORS: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.75)",
  medium: "rgba(245, 158, 11, 0.75)",
  high: "rgba(251, 146, 60, 0.85)",
  critical: "rgba(248, 113, 113, 0.9)",
  local: "rgba(96, 165, 250, 0.5)",
};

const TONE_TRACK: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.1)",
  medium: "rgba(245, 158, 11, 0.1)",
  high: "rgba(251, 146, 60, 0.12)",
  critical: "rgba(248, 113, 113, 0.14)",
  local: "rgba(96, 165, 250, 0.08)",
};

export default function SidebarUsage() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const toggleUsagePanel = useUIStore((s) => s.toggleUsagePanel);

  const hasData = Object.keys(snapshots).length > 0;
  if (!hasData) return null;

  return (
    <div className="sidebar-usage">
      <SectionHeader label="Usage" />

      <div className="sidebar-usage__providers">
        {PROVIDERS.map((provider) => {
          const snapshot = snapshots[provider] ?? null;
          const w = getPrimaryWindow(snapshot);
          const pct = w?.usedPercent;
          const hasPercent = pct != null;
          const clampedPct = hasPercent ? Math.min(pct, 100) : 0;

          const w7d = snapshot?.summaryWindows.find((sw) => sw.window === "7d") ?? null;
          const pct7d = w7d?.usedPercent;

          const tone = barTone(pct, pct7d);

          return (
            <button
              key={provider}
              type="button"
              className="sidebar-usage__row"
              onClick={toggleUsagePanel}
            >
              <span className="sidebar-usage__name">{getProviderLabel(provider)}</span>

              <div className="sidebar-usage__bar-wrap">
                <div className="sidebar-usage__bar">
                  <div
                    className="sidebar-usage__bar-track"
                    style={{ background: TONE_TRACK[tone] }}
                  />
                  <div
                    className="sidebar-usage__bar-fill"
                    style={{
                      width: `${clampedPct}%`,
                      background: TONE_COLORS[tone],
                    }}
                  />
                  {pct7d != null && hasPercent && (
                    <div
                      className="sidebar-usage__bar-pace"
                      style={{ left: `${Math.min(pct7d, 100)}%` }}
                    />
                  )}
                </div>
              </div>

              <span className="sidebar-usage__value">
                {hasPercent ? formatPercent(pct) : "—"}
              </span>
              <span className="sidebar-usage__tokens">
                {formatTokenCount(snapshot?.localDetails?.tokens5h ?? w?.tokenTotal ?? null)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
