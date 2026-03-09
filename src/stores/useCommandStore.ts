import { create } from "zustand";
import type { CommandState, CommandStatus, CommandConfig } from "../lib/types";

interface CommandStore {
  commands: CommandState[];
  loadCommands: (configs: CommandConfig[]) => void;
  setCommandStatus: (name: string, status: CommandStatus) => void;
  setCommandPtyId: (name: string, ptyId: number | null) => void;
  clearCommands: () => void;
}

export const useCommandStore = create<CommandStore>((set) => ({
  commands: [],

  loadCommands: (configs: CommandConfig[]) => {
    const commands: CommandState[] = configs.map((c) => ({
      name: c.name,
      command: c.command,
      status: "stopped",
      ptyId: null,
      autostart: c.autostart,
      env: c.env,
    }));
    set({ commands });
  },

  setCommandStatus: (name: string, status: CommandStatus) => {
    set((state) => ({
      commands: state.commands.map((c) =>
        c.name === name ? { ...c, status } : c,
      ),
    }));
  },

  setCommandPtyId: (name: string, ptyId: number | null) => {
    set((state) => ({
      commands: state.commands.map((c) =>
        c.name === name ? { ...c, ptyId } : c,
      ),
    }));
  },

  clearCommands: () => {
    set({ commands: [] });
  },
}));
