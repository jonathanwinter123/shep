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
  computePace,
  formatCost,
  formatPercent,
  formatReset,
  formatTokenCount,
  getProviderLabel,
  paceLabel,
  type PaceStatus,
} from "../usage/usageHelpers";
import type { UsageProvider, UsageSettings, ProviderUsageSnapshot } from "../../lib/types";
import type { UsageWindowSnapshot } from "../../lib/types";

type SidebarWindow = Extract<TimeWindow, "5h" | "7d">;

const WINDOWS: { key: SidebarWindow; label: string }[] = [
  { key: "5h", label: "5h" },
  { key: "7d", label: "7d" },
];

const PACE_LABEL_COLORS: Record<PaceStatus, string> = {
  under: "rgba(52, 211, 153, 0.8)",
  on: "var(--text-muted)",
  over: "rgba(248, 113, 113, 0.8)",
};

interface SidebarUtilizationItem {
  id: string;
  provider: UsageProvider;
  label: string;
  pct: number;
  tokens: number;
  sublabel: string;
  pace: { status: PaceStatus; elapsedPct: number } | null;
  meta?: string;
}

interface TooltipState {
  item: SidebarUtilizationItem;
  rect: DOMRect;
}

function sidebarProviderWindows(provider: UsageProvider, snap: ProviderUsageSnapshot, window: SidebarWindow): UsageWindowSnapshot[] {
  const windows = snap.summaryWindows
    .filter((sw) => sw.usedPercent != null && sw.sourceType === "provider")
    .filter((sw) => sw.window === window || sw.window.startsWith("24h_"));

  if (provider !== "gemini") return windows;

  const pro = windows.find((sw) => sw.window === "24h_pro");
  return pro ? [pro] : windows;
}

function currentMonthElapsedPct(now: Date): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.min(Math.max(((now.getTime() - monthStart.getTime()) / (nextMonth.getTime() - monthStart.getTime())) * 100, 0), 100);
}

function windowTokenTotal(snap: ProviderUsageSnapshot, window: SidebarWindow): number {
  if (!snap.localDetails) return 0;
  return window === "5h" ? snap.localDetails.tokens5h : snap.localDetails.tokens7d;
}

function buildUtilizationItems(
  snapshots: Record<string, ProviderUsageSnapshot>,
  settings: UsageSettings,
  window: SidebarWindow,
): SidebarUtilizationItem[] {
  const now = new Date();
  const elapsedMonthPct = currentMonthElapsedPct(now);
  const items: SidebarUtilizationItem[] = [];

  ALL_USAGE_PROVIDERS.forEach((provider) => {
    const config = settings[provider];
    const snap = snapshots[provider];
    if (!config.show || config.budgetMode !== "custom" || config.monthlyBudget == null || config.monthlyBudget <= 0 || !snap?.localDetails?.costMonth) return;

    const budget = config.monthlyBudget;
    const currentMonthCost = snap.localDetails.costMonth;
    const usedPct = (currentMonthCost / budget) * 100;
    const tokens = windowTokenTotal(snap, window);
    const delta = usedPct - elapsedMonthPct;
    const paceStatus: PaceStatus = delta <= -10 ? "under" : delta >= 10 ? "over" : "on";

    items.push({
      id: `budget-${provider}`,
      provider,
      label: "Monthly Budget",
      pct: usedPct,
      tokens,
      sublabel: `${formatCost(currentMonthCost)} spent of ${formatCost(budget)}`,
      pace: { status: paceStatus, elapsedPct: elapsedMonthPct },
    });
  });

  ALL_USAGE_PROVIDERS.forEach((provider) => {
    const config = settings[provider];
    const snap = snapshots[provider];
    if (!config.show || !snap) return;
    const tokens = windowTokenTotal(snap, window);

    sidebarProviderWindows(provider, snap, window)
      .forEach((w) => {
        const pace = computePace(w);
        items.push({
          id: w.windowId,
          provider,
          label: w.window.startsWith("24h_") ? w.label : `${w.label} limit`,
          pct: w.usedPercent!,
          tokens,
          sublabel: w.remainingPercent != null ? `${formatPercent(w.remainingPercent)} remaining` : "",
          pace,
          meta: w.resetAt ? `resets in ${formatReset(w.resetAt)}` : undefined,
        });
      });
  });

  return items.sort((a, b) => b.tokens - a.tokens || b.pct - a.pct);
}

function UsageTooltip({ tip }: { tip: TooltipState }) {
  const { item } = tip;
  const top = tip.rect.top + tip.rect.height / 2;
  const left = tip.rect.right + 10;

  return (
    <div
      className="sidebar-usage__tooltip"
      style={{ top, left, transform: "translateY(-50%)" }}
    >
      <div className="sidebar-usage__tooltip-header">
        {assistantLogoSrc[item.provider] && (
          <img
            src={assistantLogoSrc[item.provider]}
            alt=""
            className={`sidebar-usage__icon ${getAssistantLogoClass(item.provider) ?? ""}`}
            style={{ opacity: 1 }}
          />
        )}
        <span>{getProviderLabel(item.provider)}</span>
        <span className="sidebar-usage__tooltip-window">{item.label}</span>
      </div>

      <div className="sidebar-usage__tooltip-rows">
        <div className="sidebar-usage__tooltip-row sidebar-usage__tooltip-row--total">
          <span>Used</span>
          <span>{formatPercent(item.pct)}</span>
        </div>
        <div className="sidebar-usage__tooltip-row">
          <span>Tokens</span>
          <span>{formatTokenCount(item.tokens)}</span>
        </div>
        {item.sublabel && (
          <div className="sidebar-usage__tooltip-row">
            <span>Detail</span>
            <span>{item.sublabel}</span>
          </div>
        )}
        {item.pace && (
          <div className="sidebar-usage__tooltip-row">
            <span>Pace</span>
            <span style={{ color: PACE_LABEL_COLORS[item.pace.status] }}>{paceLabel(item.pace.status)}</span>
          </div>
        )}
        {item.meta && (
          <div className="sidebar-usage__tooltip-row">
            <span>Reset</span>
            <span>{item.meta.replace(/^resets in /, "")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SidebarUsage() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const window = useUsageStore((s) => s.sidebarWindow);
  const usageSettings = useUsageSettingsStore((s) => s.settings);
  const { setSidebarWindow } = useUsageStore.getState();
  const { toggleUsagePanel } = useUIStore.getState();

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const items = useMemo(
    () => buildUtilizationItems(snapshots, usageSettings, window),
    [snapshots, usageSettings, window],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (items.length === 0) return null;

  return (
    <div className="sidebar-usage">
      <div className="sidebar-usage__header">
        <div className="section-label !p-0">Utilization</div>
        <div className="sidebar-usage__window-toggle">
          {WINDOWS.map((tw) => (
            <button
              key={tw.key}
              type="button"
              className={`sidebar-usage__window-btn ${window === tw.key ? "sidebar-usage__window-btn--active" : ""}`}
              onClick={() => setSidebarWindow(tw.key)}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-usage__providers">
        {items.map((item) => {
          const tone = barTone(item.pace, item.pct);
          const logoSrc = assistantLogoSrc[item.provider];

          return (
            <button
              key={item.id}
              type="button"
              className="sidebar-usage__row"
              onClick={toggleUsagePanel}
              onMouseEnter={(e) => setTooltip({ item, rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={handleMouseLeave}
            >
              {logoSrc ? (
                <img src={logoSrc} alt={item.provider} className={`sidebar-usage__icon ${getAssistantLogoClass(item.provider) ?? ""}`} />
              ) : (
                <span className="sidebar-usage__name">{item.provider}</span>
              )}

              <div className="sidebar-usage__bar-wrap">
                <div className="sidebar-usage__bar">
                  <div className="sidebar-usage__bar-track" style={{ background: TONE_TRACK[tone] }} />
                  <div
                    className="sidebar-usage__bar-fill"
                    style={{ width: `${Math.min(item.pct, 100)}%`, background: TONE_COLORS[tone] }}
                  />
                  {item.pace && (
                    <div
                      className="sidebar-usage__bar-pace"
                      style={{ left: `${Math.min(item.pace.elapsedPct, 100)}%` }}
                      title={`${Math.round(item.pace.elapsedPct)}% of window elapsed`}
                    />
                  )}
                </div>
              </div>

              <span className="sidebar-usage__value">
                {formatPercent(item.pct)}
              </span>
            </button>
          );
        })}
      </div>

      {tooltip && <UsageTooltip tip={tooltip} />}
    </div>
  );
}
