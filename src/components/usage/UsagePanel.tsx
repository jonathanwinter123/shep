import { useState, useMemo, useEffect, useCallback } from "react";
import { RefreshCcw } from "lucide-react";
import { useUsageStore, type TimeWindow } from "../../stores/useUsageStore";
import { getUsageDetails } from "../../lib/tauri";
import type { ProviderUsageSnapshot, UsageProvider, LocalUsageDetails } from "../../lib/types";
import { formatPercent, formatReset, formatTokenCount, formatCost, usageTone, computePace, paceLabel } from "./usageHelpers";

type FilterTab = "all" | UsageProvider;

const PROVIDERS: UsageProvider[] = ["claude", "codex", "gemini"];
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "claude", label: "Claude" },
  { key: "codex", label: "Codex" },
  { key: "gemini", label: "Gemini" },
];
const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "5h", label: "5 hour" },
  { key: "7d", label: "7 day" },
  { key: "30d", label: "30 day" },
];

const TONE_COLORS: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.7)",
  medium: "rgba(245, 158, 11, 0.7)",
  high: "rgba(251, 146, 60, 0.8)",
  critical: "rgba(248, 113, 113, 0.85)",
  local: "rgba(96, 165, 250, 0.5)",
};

const TONE_TRACK: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.08)",
  medium: "rgba(245, 158, 11, 0.08)",
  high: "rgba(251, 146, 60, 0.1)",
  critical: "rgba(248, 113, 113, 0.12)",
  local: "rgba(96, 165, 250, 0.06)",
};

function ProgressBar({ percent, tone }: { percent: number | null; tone: string }) {
  const pct = percent != null ? Math.min(percent, 100) : 0;
  return (
    <div className="usage-progress">
      <div className="usage-progress__track" style={{ background: TONE_TRACK[tone] }}>
        <div
          className="usage-progress__fill"
          style={{ width: `${pct}%`, background: TONE_COLORS[tone] }}
        />
      </div>
    </div>
  );
}

function RateLimitWindows({ snapshot }: { snapshot: ProviderUsageSnapshot }) {
  const allWindows = [...snapshot.summaryWindows, ...snapshot.extraWindows];
  if (allWindows.length === 0) return null;

  return (
    <div className="usage-card__windows">
      {allWindows.map((w) => {
        const tone = usageTone(w);
        const hasPercent = w.usedPercent != null;
        const pace = computePace(w);
        return (
          <div key={`${snapshot.provider}-${w.window}`} className="usage-window">
            <div className="usage-window__header">
              <span className="usage-window__label">{w.label}</span>
              <span className="usage-window__value">
                {hasPercent ? formatPercent(w.usedPercent) : formatTokenCount(w.tokenTotal)}
              </span>
            </div>
            {hasPercent && <ProgressBar percent={w.usedPercent} tone={tone} />}
            <div className="usage-window__meta">
              {hasPercent ? (
                <>
                  <span>{formatPercent(w.remainingPercent)} remaining</span>
                  {pace && <span className={`usage-window__pace usage-window__pace--${pace.status}`}>{paceLabel(pace.status)}</span>}
                  <span>resets {formatReset(w.resetAt)}</span>
                </>
              ) : (
                <span>{w.sourceType} observed</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WindowedDetails({ details }: { details: LocalUsageDetails }) {
  return (
    <>
      {(details.tokensInput != null || details.tokensOutput != null) && (
        <div className="usage-card__section">
          <h4 className="section-label !p-0">By Type</h4>
          <div className="usage-tokens">
            {details.tokensInput != null && <div className="usage-tokens__row"><span>Input</span><strong>{formatTokenCount(details.tokensInput)}</strong></div>}
            {details.tokensOutput != null && <div className="usage-tokens__row"><span>Output</span><strong>{formatTokenCount(details.tokensOutput)}</strong></div>}
            {details.tokensCached != null && <div className="usage-tokens__row"><span>Cached</span><strong>{formatTokenCount(details.tokensCached)}</strong></div>}
            {details.tokensThoughts != null && <div className="usage-tokens__row"><span>Thoughts</span><strong>{formatTokenCount(details.tokensThoughts)}</strong></div>}
          </div>
        </div>
      )}

      {details.topModels.length > 0 && (
        <div className="usage-card__section">
          <h4 className="section-label !p-0">Models</h4>
          <div className="usage-tokens">
            {details.topModels.map((m) => (
              <div key={m.name} className="usage-tokens__row">
                <span className="usage-tokens__model">{m.name}</span>
                <div className="usage-tokens__values">
                  {m.cost != null && <span className="usage-tokens__cost">{formatCost(m.cost)}</span>}
                  <strong>{formatTokenCount(m.tokens)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.topTasks.length > 0 && (
        <div className="usage-card__section">
          <h4 className="section-label !p-0">Sessions</h4>
          <div className="usage-tasks">
            {details.topTasks.map((t) => (
              <div key={t.id} className="usage-task">
                <div className="usage-task__info">
                  <span className="usage-task__label">{t.label}</span>
                  <span className="usage-task__project">{t.project ?? "—"}</span>
                </div>
                <div className="usage-task__values">
                  {t.cost != null && <span className="usage-task__cost">{formatCost(t.cost)}</span>}
                  <strong className="usage-task__tokens">{formatTokenCount(t.tokens)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.topProjects.length > 0 && (
        <div className="usage-card__section">
          <h4 className="section-label !p-0">Projects</h4>
          <div className="usage-tokens">
            {details.topProjects.map((p) => (
              <div key={p.name} className="usage-tokens__row">
                <span>{p.name}</span>
                <div className="usage-tokens__values">
                  {p.cost != null && <span className="usage-tokens__cost">{formatCost(p.cost)}</span>}
                  <strong>{formatTokenCount(p.tokens)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ProviderCard({
  snapshot,
  details,
  window,
}: {
  snapshot: ProviderUsageSnapshot | null;
  details: LocalUsageDetails | null;
  window: TimeWindow;
}) {
  if (!snapshot) return null;

  const windowTotal = details
    ? window === "5h" ? details.tokens5h : window === "7d" ? details.tokens7d : details.tokens30d
    : null;
  const windowCost = details
    ? window === "5h" ? details.cost5h : window === "7d" ? details.cost7d : details.cost30d
    : null;

  return (
    <div className="usage-card">
      <div className="usage-card__header">
        <div className="flex items-center justify-between">
          <span className={`usage-card__status usage-card__status--${snapshot.status}`}>{snapshot.status}</span>
          <div className="usage-card__header-stats">
            {windowCost != null && <span className="usage-card__window-cost">{formatCost(windowCost)}</span>}
            {windowTotal != null && (
              <span className="usage-card__window-total">{formatTokenCount(windowTotal)} tokens</span>
            )}
          </div>
        </div>
        {snapshot.error && <p className="usage-card__error">{snapshot.error}</p>}
      </div>

      <RateLimitWindows snapshot={snapshot} />

      {details && <WindowedDetails details={details} />}
    </div>
  );
}

export default function UsagePanel() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const fetchSnapshots = useUsageStore((s) => s.fetchSnapshots);
  const loading = useUsageStore((s) => s.loading);
  const window = useUsageStore((s) => s.window);
  const setWindow = useUsageStore((s) => s.setWindow);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [detailsMap, setDetailsMap] = useState<Record<string, LocalUsageDetails>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  const visibleProviders = useMemo(() => {
    if (filter === "all") return PROVIDERS;
    return [filter];
  }, [filter]);

  // Fetch windowed details when window or filter changes
  const fetchDetails = useCallback(async () => {
    setDetailsLoading(true);
    const results: Record<string, LocalUsageDetails> = {};
    const providers = filter === "all" ? PROVIDERS : [filter];
    await Promise.all(
      providers.map(async (provider) => {
        try {
          results[provider] = await getUsageDetails(provider, window);
        } catch {
          // Provider may not have data — that's fine
        }
      }),
    );
    setDetailsMap(results);
    setDetailsLoading(false);
  }, [filter, window]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  // Re-fetch details when snapshots update (e.g. after ingest or refresh)
  const snapshotKeys = Object.keys(snapshots).join(",");
  useEffect(() => {
    if (snapshotKeys) {
      void fetchDetails();
    }
  }, [snapshotKeys, fetchDetails]);

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label !p-0">Usage</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={() => { void fetchSnapshots(); void fetchDetails(); }}
          aria-label="Refresh usage"
        >
          <RefreshCcw size={14} className={loading || detailsLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="usage-filter-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`usage-filter-tab ${filter === tab.key ? "usage-filter-tab--active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="usage-window-tabs">
        {TIME_WINDOWS.map((tw) => (
          <button
            key={tw.key}
            type="button"
            className={`usage-window-tab ${window === tw.key ? "usage-window-tab--active" : ""}`}
            onClick={() => setWindow(tw.key)}
          >
            {tw.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 mt-5">
        {visibleProviders.map((provider) => {
          const snapshot = snapshots[provider] ?? null;
          const details = detailsMap[provider] ?? null;
          return (
            <div key={provider}>
              <h3 className="section-label !p-0 mb-3">{provider === "codex" ? "Codex" : provider === "claude" ? "Claude" : "Gemini"}</h3>
              <ProviderCard snapshot={snapshot} details={details} window={window} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
