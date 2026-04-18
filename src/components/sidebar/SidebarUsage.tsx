import { useMemo, useState, useCallback } from "react";
import { useUsageStore, type TimeWindow } from "../../stores/useUsageStore";
import { useUsageSettingsStore } from "../../stores/useUsageSettingsStore";
import { useUIStore } from "../../stores/useUIStore";
import { assistantLogoSrc, getAssistantLogoClass } from "../../lib/assistantLogos";
import {
  ALL_USAGE_PROVIDERS,
  TONE_COLORS,
  TONE_TRACK,
  barTone,
  formatPercent,
  formatTokenCount,
  formatCost,
  computePace,
  syntheticBudgetWindow,
  getProviderLabel,
} from "../usage/usageHelpers";
import type { ProviderUsageSnapshot } from "../../lib/types";

const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "5h", label: "5h" },
  { key: "7d", label: "7d" },
];

interface TooltipState {
  provider: string;
  snapshot: ProviderUsageSnapshot;
  tokens: number | null;
  cost: number | null;
  pct: number | null;
  rect: DOMRect;
}

function UsageTooltip({ tip, window }: { tip: TooltipState; window: TimeWindow }) {
  const local = tip.snapshot.localDetails;
  const input = local?.tokensInput ?? null;
  const output = local?.tokensOutput ?? null;
  const cache = local?.tokensCached ?? null;

  const top = tip.rect.top + tip.rect.height / 2;
  const left = tip.rect.right + 10;

  return (
    <div
      className="sidebar-usage__tooltip"
      style={{ top, left, transform: "translateY(-50%)" }}
    >
      <div className="sidebar-usage__tooltip-header">
        {assistantLogoSrc[tip.provider as keyof typeof assistantLogoSrc] && (
          <img
            src={assistantLogoSrc[tip.provider as keyof typeof assistantLogoSrc]}
            alt=""
            className={`sidebar-usage__icon ${getAssistantLogoClass(tip.provider as never) ?? ""}`}
            style={{ opacity: 1 }}
          />
        )}
        <span>{getProviderLabel(tip.provider as never)}</span>
        <span className="sidebar-usage__tooltip-window">{window}</span>
      </div>

      <div className="sidebar-usage__tooltip-rows">
        {tip.pct != null && (
          <div className="sidebar-usage__tooltip-row">
            <span>Used</span>
            <span>{formatPercent(tip.pct)}</span>
          </div>
        )}
        {tip.cost != null && tip.cost > 0 && (
          <div className="sidebar-usage__tooltip-row">
            <span>Est. Cost</span>
            <span>{formatCost(tip.cost)}</span>
          </div>
        )}
        {tip.tokens != null && tip.tokens > 0 && (
          <div className="sidebar-usage__tooltip-row sidebar-usage__tooltip-row--total">
            <span>Total</span>
            <span>{formatTokenCount(tip.tokens)}</span>
          </div>
        )}
        {input != null && input > 0 && (
          <div className="sidebar-usage__tooltip-row">
            <span>Input</span>
            <span>{formatTokenCount(input)}</span>
          </div>
        )}
        {output != null && output > 0 && (
          <div className="sidebar-usage__tooltip-row">
            <span>Output</span>
            <span>{formatTokenCount(output)}</span>
          </div>
        )}
        {cache != null && cache > 0 && (
          <div className="sidebar-usage__tooltip-row">
            <span>Cache</span>
            <span>{formatTokenCount(cache)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SidebarUsage() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const window = useUsageStore((s) => s.window);
  const usageSettings = useUsageSettingsStore((s) => s.settings);
  const { setWindow } = useUsageStore.getState();
  const { toggleUsagePanel } = useUIStore.getState();

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const providers = useMemo(() => ALL_USAGE_PROVIDERS.filter((p) => usageSettings[p].show), [usageSettings]);

  const handleMouseEnter = useCallback((
    e: React.MouseEvent<HTMLButtonElement>,
    provider: string,
    snapshot: ProviderUsageSnapshot,
    tokens: number | null,
    cost: number | null,
    pct: number | null,
  ) => {
    setTooltip({ provider, snapshot, tokens, cost, pct, rect: e.currentTarget.getBoundingClientRect() });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const hasData = Object.keys(snapshots).length > 0;
  if (!hasData || providers.length === 0) return null;

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
        {providers.map((provider) => {
          const snapshot = snapshots[provider] ?? null;
          if (!snapshot) return null;

          const local = snapshot.localDetails;
          const budgetWindow = window === "5h" || window === "7d" ? window : null;
          const providerConfig = usageSettings[provider];
          const syntheticWindow = providerConfig.budgetMode === "custom"
            && budgetWindow
            ? syntheticBudgetWindow(
                provider,
                budgetWindow,
                local ? budgetWindow === "5h" ? local.cost5h : local.cost7d : null,
                providerConfig.monthlyBudget,
              )
            : null;
          const quota24h = providerConfig.budgetMode === "subscription"
            ? snapshot.summaryWindows
                .filter((sw) => sw.window.startsWith("24h_") && sw.usedPercent != null)
                .sort((a, b) => (b.usedPercent ?? 0) - (a.usedPercent ?? 0))[0] ?? null
            : null;
          const providerWindow = snapshot.summaryWindows.find((sw) => sw.window === window && sw.usedPercent != null)
            ?? quota24h;
          const w = providerWindow ?? syntheticWindow ?? snapshot.summaryWindows.find((sw) => sw.window === window) ?? null;
          const pct = w?.usedPercent;
          const hasPercent = pct != null;
          const clampedPct = hasPercent ? Math.min(pct, 100) : 0;

          const pace = computePace(w);
          const tone = barTone(pace, pct);

          const tokens = local
            ? window === "5h" ? local.tokens5h : window === "7d" ? local.tokens7d : local.tokens30d
            : w?.tokenTotal ?? null;
          const cost = local
            ? window === "5h" ? local.cost5h : window === "7d" ? local.cost7d : local.cost30d
            : null;

          const logoSrc = assistantLogoSrc[provider];

          return (
            <button
              key={provider}
              type="button"
              className="sidebar-usage__row"
              onClick={toggleUsagePanel}
              onMouseEnter={(e) => handleMouseEnter(e, provider, snapshot, tokens ?? null, cost ?? null, pct ?? null)}
              onMouseLeave={handleMouseLeave}
            >
              {logoSrc ? (
                <img src={logoSrc} alt={provider} className={`sidebar-usage__icon ${getAssistantLogoClass(provider) ?? ""}`} />
              ) : (
                <span className="sidebar-usage__name">{provider}</span>
              )}

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
                {hasPercent ? formatPercent(pct) : ""}
              </span>
            </button>
          );
        })}
      </div>

      {tooltip && <UsageTooltip tip={tooltip} window={window} />}
    </div>
  );
}
