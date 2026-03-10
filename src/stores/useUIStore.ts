import { create } from "zustand";

interface UIStore {
  settingsOpen: boolean;
  username: string | null;
  computerName: string | null;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  setUsername: (name: string) => void;
  setComputerName: (name: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  settingsOpen: false,
  username: null,
  computerName: null,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setUsername: (name: string) => set({ username: name }),
  setComputerName: (name: string) => set({ computerName: name }),
}));
