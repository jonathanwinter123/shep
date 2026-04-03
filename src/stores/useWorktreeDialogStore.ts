import { create } from "zustand";

export type WorktreeCloseChoice = "keep" | "push" | "discard";

interface PendingClose {
  tabId: string;
  branch: string | null;
  worktreePath: string;
  repoPath: string;
  dirty: boolean;
  resolve: (choice: WorktreeCloseChoice | null) => void;
}

interface WorktreeDialogStore {
  pending: PendingClose | null;
  open: (info: Omit<PendingClose, "resolve">) => Promise<WorktreeCloseChoice | null>;
  respond: (choice: WorktreeCloseChoice | null) => void;
}

export const useWorktreeDialogStore = create<WorktreeDialogStore>((set, get) => ({
  pending: null,

  open: (info) =>
    new Promise((resolve) => {
      set({ pending: { ...info, resolve } });
    }),

  respond: (choice) => {
    const { pending } = get();
    if (pending) {
      pending.resolve(choice);
      set({ pending: null });
    }
  },
}));
