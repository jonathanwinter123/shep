import type { ProviderUsageSnapshot, UsageProvider, UsageWindowSnapshot } from "../../lib/types";

const WINDOW_PRIORITY = ["5h", "7d", "30d"];

export function getPrimaryWindow(snapshot: ProviderUsageSnapshot | null): UsageWindowSnapshot | null {
  if (!snapshot) return null;
  for (const window of WINDOW_PRIORITY) {
    const match = snapshot.summaryWindows.find((entry) => entry.window === window);
    if (match) return match;
  }
  return snapshot.summaryWindows[0] ?? null;
}

export function getProviderLabel(provider: UsageProvider): string {
  switch (provider) {
    case "codex":
      return "Codex";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
  }
}

export function formatPercent(value: number | null): string {
  if (value == null) return "n/a";
  return `${Math.round(value)}%`;
}

export function formatTokenCount(value: number | null): string {
  if (value == null) return "n/a";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export function formatReset(resetAt: string | null): string {
  if (!resetAt) return "No reset";

  const millis = Number(resetAt);
  const target = Number.isFinite(millis) ? new Date(millis * 1000) : new Date(resetAt);
  if (Number.isNaN(target.getTime())) return "No reset";

  const diffMs = target.getTime() - Date.now();
  const clamped = Math.max(diffMs, 0);
  const totalMinutes = Math.floor(clamped / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function usageTone(window: UsageWindowSnapshot | null): "low" | "medium" | "high" | "critical" | "local" {
  if (!window) return "local";
  if (window.usedPercent == null) return "local";
  if (window.usedPercent >= 90) return "critical";
  if (window.usedPercent >= 75) return "high";
  if (window.usedPercent >= 50) return "medium";
  return "low";
}
