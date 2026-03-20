import { useUsageStore, type TimeWindow } from "../../stores/useUsageStore";
import { useUIStore } from "../../stores/useUIStore";
import type { UsageProvider } from "../../lib/types";
import { getProviderLabel, formatPercent, formatTokenCount, computePace } from "../usage/usageHelpers";

const PROVIDERS: UsageProvider[] = ["claude", "codex", "gemini"];
const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "5h", label: "5h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

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

/** Bar tone based on pace status rather than raw thresholds. */
function barTone(pace: ReturnType<typeof computePace>, pct: number | null | undefined): string {
  if (pct == null) return "local";
  if (pct >= 90) return "critical";
  if (pace?.status === "over") return pct >= 50 ? "high" : "medium";
  if (pct >= 75) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

export default function SidebarUsage() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const window = useUsageStore((s) => s.window);
  const setWindow = useUsageStore((s) => s.setWindow);
  const toggleUsagePanel = useUIStore((s) => s.toggleUsagePanel);

  const hasData = Object.keys(snapshots).length > 0;
  if (!hasData) return null;

  return (
    <div className="sidebar-usage">
      <div className="sidebar-usage__header">
        <div className="section-label !p-0">Usage</div>
        <div className="sidebar-usage__window-toggle">
          {WINDOWS.map((tw) => (
            <button
              key={tw.key}
              type="button"
              className={`sidebar-usage__window-btn ${window === tw.key ? "sidebar-usage__window-btn--active" : ""}`}
              onClick={() => setWindow(tw.key)}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-usage__providers">
        {PROVIDERS.map((provider) => {
          const snapshot = snapshots[provider] ?? null;
          if (!snapshot) return null;

          const w = snapshot.summaryWindows.find((sw) => sw.window === window) ?? null;
          const pct = w?.usedPercent;
          const hasPercent = pct != null;
          const clampedPct = hasPercent ? Math.min(pct, 100) : 0;

          const pace = computePace(w);
          const tone = barTone(pace, pct);

          const local = snapshot.localDetails;
          const tokens = local
            ? window === "5h" ? local.tokens5h : window === "7d" ? local.tokens7d : local.tokens30d
            : w?.tokenTotal ?? null;

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
                  {pace && pct != null && pct > 0 && (
                    <div
                      className="sidebar-usage__bar-pace"
                      style={{ left: `${Math.min(pace.elapsedPct, 100)}%` }}
                      title={`${Math.round(pace.elapsedPct)}% of window elapsed`}
                    />
                  )}
                </div>
              </div>

              <span className="sidebar-usage__value">
                {hasPercent ? formatPercent(pct) : "—"}
              </span>
              <span className="sidebar-usage__tokens">
                {formatTokenCount(tokens)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
