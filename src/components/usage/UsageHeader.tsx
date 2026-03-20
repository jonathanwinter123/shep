import { Activity } from "lucide-react";
import { useUsageStore } from "../../stores/useUsageStore";
import { useUIStore } from "../../stores/useUIStore";
import type { UsageProvider } from "../../lib/types";
import { getPrimaryWindow, getProviderLabel, formatPercent, formatTokenCount, usageTone } from "./usageHelpers";

const PROVIDERS: UsageProvider[] = ["codex", "claude", "gemini"];

const TONE_COLORS: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.7)",
  medium: "rgba(245, 158, 11, 0.7)",
  high: "rgba(251, 146, 60, 0.8)",
  critical: "rgba(248, 113, 113, 0.85)",
  local: "rgba(96, 165, 250, 0.5)",
};

const TONE_TRACK: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.1)",
  medium: "rgba(245, 158, 11, 0.1)",
  high: "rgba(251, 146, 60, 0.12)",
  critical: "rgba(248, 113, 113, 0.14)",
  local: "rgba(96, 165, 250, 0.08)",
};

export default function UsageHeader() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const loading = useUsageStore((s) => s.loading);
  const toggleUsagePanel = useUIStore((s) => s.toggleUsagePanel);

  return (
    <button
      type="button"
      className="usage-header"
      onClick={(e) => { e.stopPropagation(); toggleUsagePanel(); }}
      aria-label="Open usage details"
    >
      <div className="usage-header__indicators">
        {PROVIDERS.map((provider) => {
          const snapshot = snapshots[provider] ?? null;
          const window = getPrimaryWindow(snapshot);
          const tone = usageTone(window);
          const pct = window?.usedPercent;
          const hasPercent = pct != null;

          return (
            <div key={provider} className="usage-indicator">
              <div className="usage-indicator__bar">
                <div
                  className="usage-indicator__fill"
                  style={{
                    width: hasPercent ? `${Math.min(pct, 100)}%` : "0%",
                    background: TONE_COLORS[tone],
                  }}
                />
                <div
                  className="usage-indicator__track"
                  style={{ background: TONE_TRACK[tone] }}
                />
              </div>
              <span className="usage-indicator__label">{getProviderLabel(provider)}</span>
              <span className="usage-indicator__value">
                {hasPercent ? formatPercent(pct) : formatTokenCount(window?.tokenTotal ?? null)}
              </span>
            </div>
          );
        })}
      </div>
      {loading && (
        <span className="usage-header__loading" aria-hidden="true">
          <Activity size={11} />
        </span>
      )}
    </button>
  );
}
