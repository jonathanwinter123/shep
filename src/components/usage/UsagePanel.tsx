import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getUsageOverview } from "../../lib/tauri";
import type {
  UsageBreakdownItem,
  UsageOverview,
  UsageTrendBucket,
} from "../../lib/types";
import { assistantLogoSrc } from "../../lib/assistantLogos";
import { useUsageStore, type TimeWindow } from "../../stores/useUsageStore";
import { formatCost, formatPercent, formatTokenCount, getProviderLabel } from "./usageHelpers";
const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "5h", label: "5 hour" },
  { key: "7d", label: "7 day" },
  { key: "30d", label: "30 day" },
];

function presentCost(value: number | null): string {
  return value != null ? formatCost(value) : "—";
}

function Stat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="usage-stat">
      <span className="usage-stat__label">{label}</span>
      <strong className="usage-stat__value">{value}</strong>
      {meta && <span className="usage-stat__meta">{meta}</span>}
    </div>
  );
}

function Heatmap({ trend }: { trend: UsageTrendBucket[] }) {
  const maxTokens = Math.max(...trend.map((bucket) => bucket.tokens), 1);

  return (
    <div className="usage-heatmap">
      <div className="usage-heatmap__grid" aria-hidden="true">
        {trend.map((bucket) => {
          const intensity = bucket.tokens === 0 ? 0 : Math.max(bucket.tokens / maxTokens, 0.12);
          return (
            <div key={`${bucket.start}-${bucket.end}`} className="usage-heatmap__cell-wrap">
              <div
                className="usage-heatmap__cell"
                style={{
                  background: bucket.tokens === 0
                    ? "color-mix(in srgb, var(--text-primary), transparent 96%)"
                    : `linear-gradient(180deg,
                        color-mix(in srgb, var(--text-primary), transparent ${92 - intensity * 14}%),
                        color-mix(in srgb, var(--status-running), transparent ${88 - intensity * 48}%)
                      )`,
                }}
                title={`${bucket.label}: ${formatTokenCount(bucket.tokens)}`}
              />
              <span className="usage-heatmap__label">{bucket.label}</span>
            </div>
          );
        })}
      </div>
      <div className="usage-heatmap__legend">
        <span>Low</span>
        <div className="usage-heatmap__legend-scale">
          <span className="usage-heatmap__legend-cell" />
          <span className="usage-heatmap__legend-cell usage-heatmap__legend-cell--mid" />
          <span className="usage-heatmap__legend-cell usage-heatmap__legend-cell--high" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

function Sparkline({
  values,
}: {
  values: number[];
}) {
  const width = 96;
  const height = 26;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
    const y = height - (value / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="usage-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function BreakdownList({
  title,
  emptyLabel,
  items,
  showSessions = false,
  withSparklines = false,
}: {
  title: string;
  emptyLabel: string;
  items: UsageBreakdownItem[];
  showSessions?: boolean;
  withSparklines?: boolean;
}) {
  return (
    <section className="usage-section">
      <div className="usage-section__header">
        <h3 className="section-label !p-0">{title}</h3>
      </div>
      {items.length > 0 ? (
        <div className="usage-list">
          {items.map((item) => (
            <div key={`${item.provider}-${item.label}`} className="usage-list__row">
              <div className="usage-list__info">
                <span className="usage-list__label">{item.label}</span>
                <span className="usage-list__meta">
                  {getProviderLabel(item.provider)}
                  {showSessions && item.sessions != null ? ` • ${item.sessions} sessions` : ""}
                </span>
              </div>
              <div className="usage-list__values">
                {withSparklines && (
                  <div className="usage-list__sparkline-wrap">
                    <Sparkline values={item.trend} />
                  </div>
                )}
                <span className="usage-list__metric">{presentCost(item.cost)}</span>
                <strong className="usage-list__metric usage-list__metric--primary">{formatTokenCount(item.tokens)}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="usage-empty">{emptyLabel}</div>
      )}
    </section>
  );
}

function OverviewPanel({ overview }: { overview: UsageOverview }) {
  return (
    <>
      <section className="usage-section">
        <div className="usage-section__header">
          <h3 className="section-label !p-0">Activity</h3>
        </div>
        <div className="usage-stats">
          <Stat label="Total Tokens" value={formatTokenCount(overview.totalTokens)} meta="tokens" />
          <Stat label="Estimated Cost" value={presentCost(overview.totalCost)} />
          <Stat label="Active Projects" value={`${overview.activeProjects}`} />
          <Stat label="Active Sessions" value={`${overview.activeSessions}`} />
        </div>
        <Heatmap trend={overview.trend} />
      </section>

      <hr className="settings-divider" />

      <section className="usage-section">
        <div className="usage-section__header">
          <h3 className="section-label !p-0">Providers</h3>
        </div>
        <div className="usage-list">
          {overview.providers.map((provider) => {
            const logoSrc = assistantLogoSrc[provider.provider];
            return (
              <div key={provider.provider} className="usage-list__row">
                <div className="usage-list__info">
                  <span className="usage-list__label usage-list__label--provider">
                    {logoSrc ? <img src={logoSrc} alt="" className="usage-list__icon" /> : null}
                    {getProviderLabel(provider.provider)}
                  </span>
                  <span className="usage-list__meta">{formatPercent(provider.sharePercent)} of total</span>
                </div>
                <div className="usage-list__values">
                  <div className="usage-list__sparkline-wrap">
                    <Sparkline values={provider.trend} />
                  </div>
                  <span className="usage-list__metric">{presentCost(provider.cost)}</span>
                  <strong className="usage-list__metric usage-list__metric--primary">{formatTokenCount(provider.tokens)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <hr className="settings-divider" />

      <BreakdownList
        title="Tool Breakdown"
        emptyLabel="No model activity yet for this window."
        items={overview.topModels}
        withSparklines
      />

      <hr className="settings-divider" />

      <BreakdownList
        title="Project Breakdown"
        emptyLabel="No project activity yet for this window."
        items={overview.topProjects}
        showSessions
        withSparklines
      />

      <hr className="settings-divider" />

      <section className="usage-section">
        <div className="usage-section__header">
          <h3 className="section-label !p-0">Methodology</h3>
        </div>
        <ul className="usage-methodology">
          <li>Usage totals and breakdowns on this screen are based on locally observed activity from this machine.</li>
          <li>Provider percentages shown in the sidebar summary come from provider-reported usage windows when available, so they are not always directly comparable to the local totals shown here.</li>
          <li>In practice, that means the sidebar percentage and this detail view can differ because they are measuring related but not identical sources.</li>
        </ul>
      </section>
    </>
  );
}

export default function UsagePanel() {
  const fetchSnapshots = useUsageStore((s) => s.fetchSnapshots);
  const loading = useUsageStore((s) => s.loading);
  const window = useUsageStore((s) => s.window);
  const setWindow = useUsageStore((s) => s.setWindow);

  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await getUsageOverview(window));
    } finally {
      setOverviewLoading(false);
    }
  }, [window]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const handleRefresh = useCallback(() => {
    void fetchSnapshots();
    void fetchOverview();
  }, [fetchOverview, fetchSnapshots]);

  const isBusy = loading || overviewLoading;

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label !p-0">Usage</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={handleRefresh}
          aria-label="Refresh usage"
        >
          <RefreshCcw size={14} className={isBusy ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="usage-window-tabs">
        {TIME_WINDOWS.map((timeWindow) => (
          <button
            key={timeWindow.key}
            type="button"
            className={`usage-window-tab ${window === timeWindow.key ? "usage-window-tab--active" : ""}`}
            onClick={() => setWindow(timeWindow.key)}
          >
            {timeWindow.label}
          </button>
        ))}
      </div>

      <div className="usage-panel">
        {overview ? (
          <OverviewPanel overview={overview} />
        ) : (
          <div className="usage-empty">Loading usage overview…</div>
        )}
      </div>
    </div>
  );
}
