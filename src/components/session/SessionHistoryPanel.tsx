import { useEffect, useCallback } from "react";
import { Play } from "lucide-react";
import { useRepoStore } from "../../stores/useRepoStore";
import { useSessionHistoryStore } from "../../stores/useSessionHistoryStore";
import SessionList from "./SessionList";

interface SessionHistoryPanelProps {
  onResumeSession: (sessionId: string) => Promise<boolean>;
}

export default function SessionHistoryPanel({ onResumeSession }: SessionHistoryPanelProps) {
  const activeRepoPath = useRepoStore((s) => s.activeRepoPath);
  const {
    sessions,
    selectedSessionId,
    conversation,
    searchQuery,
    deepSearch,
    loading,
    conversationLoading,
    loadSessions,
    selectSession,
    setSearchQuery,
    setDeepSearch,
    searchSessions,
  } = useSessionHistoryStore();

  // Load sessions on mount (legitimate useEffect — one-time initialization)
  useEffect(() => {
    if (activeRepoPath) {
      loadSessions(activeRepoPath);
    }
  }, [activeRepoPath, loadSessions]);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (deepSearch && query && activeRepoPath) {
        searchSessions(activeRepoPath, query);
      }
    },
    [deepSearch, activeRepoPath, setSearchQuery, searchSessions],
  );

  const handleDeepSearchChange = useCallback(
    (enabled: boolean) => {
      setDeepSearch(enabled);
      if (enabled && searchQuery && activeRepoPath) {
        searchSessions(activeRepoPath, searchQuery);
      } else if (!enabled && activeRepoPath) {
        loadSessions(activeRepoPath);
      }
    },
    [activeRepoPath, searchQuery, setDeepSearch, searchSessions, loadSessions],
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (activeRepoPath) {
        selectSession(activeRepoPath, sessionId);
      }
    },
    [activeRepoPath, selectSession],
  );

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);

  return (
    <div className="absolute inset-0 flex">
      {/* Left column — session list */}
      <div
        className="flex flex-col p-4 overflow-y-auto shrink-0"
        style={{
          width: 320,
          borderRight: "1px solid var(--glass-border)",
        }}
      >
        <h2 className="section-label !p-0 mb-4">Sessions</h2>
        <SessionList
          sessions={sessions}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSelectSession={handleSelectSession}
          selectedSessionId={selectedSessionId}
          loading={loading}
          showDeepSearch
          deepSearch={deepSearch}
          onDeepSearchChange={handleDeepSearchChange}
        />
      </div>

      {/* Right column — conversation viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSessionId && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm opacity-40">Select a session to view</p>
          </div>
        )}

        {selectedSessionId && (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {selectedSession?.slug || "Untitled"}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {selectedSession?.startedAt
                    ? new Date(selectedSession.startedAt).toLocaleString()
                    : ""}
                  {selectedSession ? ` — ${selectedSession.messageCount} messages` : ""}
                </span>
              </div>
              <button
                className="btn-cta flex items-center gap-1.5"
                style={{ padding: "6px 14px", fontSize: "13px" }}
                onClick={() => {
                  if (selectedSessionId) void onResumeSession(selectedSessionId);
                }}
              >
                <Play size={13} />
                Resume
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {conversationLoading && (
                <p className="text-sm opacity-50 text-center py-8">Loading conversation...</p>
              )}

              {!conversationLoading && conversation.length === 0 && (
                <p className="text-sm opacity-40 text-center py-8">No messages in this session</p>
              )}

              <div className="flex flex-col gap-4">
                {conversation.map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{
                        color: msg.role === "user"
                          ? "var(--accent, #7aa2f7)"
                          : "var(--text-muted)",
                      }}
                    >
                      {msg.role === "user" ? "You" : "Assistant"}
                    </span>
                    <div
                      className="text-sm rounded-md px-3 py-2 whitespace-pre-wrap break-words"
                      style={{
                        background: msg.role === "user"
                          ? "var(--surface-hover)"
                          : "transparent",
                        color: "var(--app-fg)",
                      }}
                    >
                      {msg.content.split("\n").map((line, j) => {
                        if (line.startsWith("[Tool Use:")) {
                          return (
                            <span
                              key={j}
                              className="block text-xs py-0.5"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {line}
                            </span>
                          );
                        }
                        return <span key={j}>{line}{"\n"}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
