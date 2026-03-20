import { useState, useMemo } from "react";
import { RefreshCcw } from "lucide-react";
import { useUsageStore } from "../../stores/useUsageStore";
import type { ProviderUsageSnapshot, UsageProvider } from "../../lib/types";
import { formatPercent, formatReset, formatTokenCount, usageTone } from "./usageHelpers";

type FilterTab = "all" | UsageProvider;

const PROVIDERS: UsageProvider[] = ["codex", "claude", "gemini"];
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "claude", label: "Claude" },
  { key: "codex", label: "Codex" },
  { key: "gemini", label: "Gemini" },
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

function ProviderCard({ snapshot }: { snapshot: ProviderUsageSnapshot | null }) {
  if (!snapshot) return null;

  const local = snapshot.localDetails;
  const allWindows = [...snapshot.summaryWindows, ...snapshot.extraWindows];

  return (
    <div className="usage-card">
      <div className="usage-card__header">
        <span className={`usage-card__status usage-card__status--${snapshot.status}`}>{snapshot.status}</span>
        {snapshot.error && <p className="usage-card__error">{snapshot.error}</p>}
      </div>

      {allWindows.length > 0 && (
        <div className="usage-card__windows">
          {allWindows.map((w) => {
            const tone = usageTone(w);
            const hasPercent = w.usedPercent != null;
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
      )}

      {local && (
        <>
          <div className="usage-card__section">
            <h4 className="section-label !p-0">Token Breakdown</h4>
            <div className="usage-tokens">
              <div className="usage-tokens__row"><span>5 hour</span><strong>{formatTokenCount(local.tokens5h)}</strong></div>
              <div className="usage-tokens__row"><span>7 day</span><strong>{formatTokenCount(local.tokens7d)}</strong></div>
              <div className="usage-tokens__row"><span>30 day</span><strong>{formatTokenCount(local.tokens30d)}</strong></div>
              <div className="usage-tokens__row"><span>All time</span><strong>{formatTokenCount(local.tokensTotal)}</strong></div>
            </div>
          </div>

          {(local.tokensInput != null || local.tokensOutput != null) && (
            <div className="usage-card__section">
              <h4 className="section-label !p-0">By Type</h4>
              <div className="usage-tokens">
                {local.tokensInput != null && <div className="usage-tokens__row"><span>Input</span><strong>{formatTokenCount(local.tokensInput)}</strong></div>}
                {local.tokensOutput != null && <div className="usage-tokens__row"><span>Output</span><strong>{formatTokenCount(local.tokensOutput)}</strong></div>}
                {local.tokensCached != null && <div className="usage-tokens__row"><span>Cached</span><strong>{formatTokenCount(local.tokensCached)}</strong></div>}
                {local.tokensThoughts != null && <div className="usage-tokens__row"><span>Thoughts</span><strong>{formatTokenCount(local.tokensThoughts)}</strong></div>}
              </div>
            </div>
          )}

          {local.topModels.length > 0 && (
            <div className="usage-card__section">
              <h4 className="section-label !p-0">Models</h4>
              <div className="usage-tokens">
                {local.topModels.map((m) => (
                  <div key={m.name} className="usage-tokens__row">
                    <span className="usage-tokens__model">{m.name}</span>
                    <strong>{formatTokenCount(m.tokens)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {local.topTasks.length > 0 && (
            <div className="usage-card__section">
              <h4 className="section-label !p-0">Recent Tasks</h4>
              <div className="usage-tasks">
                {local.topTasks.map((t) => (
                  <div key={t.id} className="usage-task">
                    <div className="usage-task__info">
                      <span className="usage-task__label">{t.label}</span>
                      <span className="usage-task__project">{t.project ?? "—"}</span>
                    </div>
                    <strong className="usage-task__tokens">{formatTokenCount(t.tokens)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {local.topProjects.length > 0 && (
            <div className="usage-card__section">
              <h4 className="section-label !p-0">Projects</h4>
              <div className="usage-tokens">
                {local.topProjects.map((p) => (
                  <div key={p.name} className="usage-tokens__row">
                    <span>{p.name}</span>
                    <strong>{formatTokenCount(p.tokens)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function UsagePanel() {
  const snapshots = useUsageStore((s) => s.snapshots);
  const fetchSnapshots = useUsageStore((s) => s.fetchSnapshots);
  const loading = useUsageStore((s) => s.loading);
  const [filter, setFilter] = useState<FilterTab>("all");

  const visibleProviders = useMemo(() => {
    if (filter === "all") return PROVIDERS;
    return [filter];
  }, [filter]);

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label !p-0">Usage</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={() => void fetchSnapshots()}
          aria-label="Refresh usage"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
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

      <div className="flex flex-col gap-5 mt-5">
        {visibleProviders.map((provider) => {
          const snapshot = snapshots[provider] ?? null;
          return (
            <div key={provider}>
              <h3 className="section-label !p-0 mb-3">{provider === "codex" ? "Codex" : provider === "claude" ? "Claude" : "Gemini"}</h3>
              <ProviderCard snapshot={snapshot} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
