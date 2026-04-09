import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { SessionSummary } from "../../lib/types";

const PAGE_SIZE = 20;

function relativeTime(iso: string): string {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

interface SessionListProps {
  sessions: SessionSummary[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSession: (sessionId: string) => void;
  selectedSessionId?: string | null;
  loading?: boolean;
  showDeepSearch?: boolean;
  deepSearch?: boolean;
  onDeepSearchChange?: (enabled: boolean) => void;
}

export default function SessionList({
  sessions,
  searchQuery,
  onSearchChange,
  onSelectSession,
  selectedSessionId,
  loading,
  showDeepSearch,
  deepSearch,
  onDeepSearchChange,
}: SessionListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!searchQuery || deepSearch) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.slug.toLowerCase().includes(q) ||
        s.firstPrompt.toLowerCase().includes(q),
    );
  }, [sessions, searchQuery, deepSearch]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="input-field w-full pl-8 pr-3 py-1.5 text-sm"
        />
      </div>

      {/* Deep search toggle */}
      {showDeepSearch && (
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={deepSearch ?? false}
            onChange={(e) => onDeepSearchChange?.(e.target.checked)}
          />
          Search conversation content
        </label>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm opacity-50 text-center py-4">Loading sessions...</p>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p className="text-sm opacity-50 text-center py-4">No sessions found</p>
      )}

      {/* Session rows */}
      <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {visible.map((session) => {
          const isSelected = session.sessionId === selectedSessionId;
          return (
            <button
              key={session.sessionId}
              className="flex flex-col gap-0.5 px-3 py-2 rounded-md text-left w-full transition-colors"
              style={{
                background: isSelected
                  ? "var(--surface-active)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = "transparent";
              }}
              onClick={() => onSelectSession(session.sessionId)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">
                  {session.slug || "Untitled"}
                </span>
                <span className="text-xs opacity-40 shrink-0">
                  {relativeTime(session.startedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {session.firstPrompt || "No prompt"}
                </span>
                <span className="text-xs opacity-30 shrink-0">
                  {session.messageCount} msgs
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          className="text-xs py-1 opacity-50 hover:opacity-80 text-center"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Load more ({filtered.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
