import { create } from "zustand";
import type { SessionSummary, SessionMessage } from "../lib/types";
import {
  listClaudeSessions,
  readClaudeSession,
  searchClaudeSessions,
} from "../lib/tauri";

const EMPTY_SESSIONS: SessionSummary[] = [];
const EMPTY_CONVERSATION: SessionMessage[] = [];

interface SessionHistoryStore {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  conversation: SessionMessage[];
  searchQuery: string;
  deepSearch: boolean;
  loading: boolean;
  conversationLoading: boolean;
  loadSessions: (repoPath: string) => Promise<void>;
  selectSession: (repoPath: string, sessionId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setDeepSearch: (enabled: boolean) => void;
  searchSessions: (repoPath: string, query: string) => Promise<void>;
  clearSelection: () => void;
  reset: () => void;
}

export const useSessionHistoryStore = create<SessionHistoryStore>((set, get) => ({
  sessions: EMPTY_SESSIONS,
  selectedSessionId: null,
  conversation: EMPTY_CONVERSATION,
  searchQuery: "",
  deepSearch: false,
  loading: false,
  conversationLoading: false,

  loadSessions: async (repoPath) => {
    set({ loading: true });
    try {
      const sessions = await listClaudeSessions(repoPath);
      set({ sessions, loading: false });
    } catch {
      set({ sessions: EMPTY_SESSIONS, loading: false });
    }
  },

  selectSession: async (repoPath, sessionId) => {
    set({ selectedSessionId: sessionId, conversationLoading: true });
    try {
      const conversation = await readClaudeSession(repoPath, sessionId);
      set({ conversation, conversationLoading: false });
    } catch {
      set({ conversation: EMPTY_CONVERSATION, conversationLoading: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setDeepSearch: (enabled) => set({ deepSearch: enabled }),

  searchSessions: async (repoPath, query) => {
    set({ loading: true });
    try {
      const matchingIds = await searchClaudeSessions(repoPath, query);
      const { sessions } = get();
      const filtered = sessions.filter((s) =>
        matchingIds.includes(s.sessionId),
      );
      set({ sessions: filtered, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clearSelection: () =>
    set({ selectedSessionId: null, conversation: EMPTY_CONVERSATION }),

  reset: () =>
    set({
      sessions: EMPTY_SESSIONS,
      selectedSessionId: null,
      conversation: EMPTY_CONVERSATION,
      searchQuery: "",
      deepSearch: false,
      loading: false,
      conversationLoading: false,
    }),
}));
