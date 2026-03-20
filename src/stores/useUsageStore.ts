import { create } from "zustand";
import { getAllUsageSnapshots } from "../lib/tauri";
import type { ProviderUsageSnapshot, UsageProvider } from "../lib/types";

interface UsageStore {
  snapshots: Record<string, ProviderUsageSnapshot>;
  loading: boolean;
  error: string | null;
  fetchSnapshots: () => Promise<void>;
  getSnapshot: (provider: UsageProvider) => ProviderUsageSnapshot | null;
}

export const useUsageStore = create<UsageStore>((set, get) => ({
  snapshots: {},
  loading: false,
  error: null,
  fetchSnapshots: async () => {
    set({ loading: true, error: null });
    try {
      const snapshots = await getAllUsageSnapshots();
      set({
        loading: false,
        snapshots: Object.fromEntries(snapshots.map((snapshot) => [snapshot.provider, snapshot])),
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch usage snapshots",
      });
    }
  },
  getSnapshot: (provider) => get().snapshots[provider] ?? null,
}));
