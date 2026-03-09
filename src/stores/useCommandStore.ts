import { create } from "zustand";
import type { CommandState, CommandStatus, CommandConfig } from "../lib/types";

interface CommandStore {
  projectCommands: Record<string, CommandState[]>;
  activeProjectPath: string | null;
  loadCommands: (repoPath: string, configs: CommandConfig[]) => void;
  switchProject: (repoPath: string) => void;
  hasProject: (repoPath: string) => boolean;
  removeProject: (repoPath: string) => void;
  setCommandStatus: (name: string, status: CommandStatus) => void;
  setCommandPtyId: (name: string, ptyId: number | null) => void;
  setCommandStatusForProject: (
    repoPath: string,
    name: string,
    status: CommandStatus,
  ) => void;
  setCommandPtyIdForProject: (
    repoPath: string,
    name: string,
    ptyId: number | null,
  ) => void;
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  projectCommands: {},
  activeProjectPath: null,

  loadCommands: (repoPath: string, configs: CommandConfig[]) => {
    const commands: CommandState[] = configs.map((c) => ({
      name: c.name,
      command: c.command,
      status: "stopped",
      ptyId: null,
      autostart: c.autostart,
      env: c.env,
    }));
    set((state) => ({
      projectCommands: {
        ...state.projectCommands,
        [repoPath]: commands,
      },
    }));
  },

  switchProject: (repoPath: string) => {
    set({ activeProjectPath: repoPath });
  },

  hasProject: (repoPath: string) => {
    return repoPath in get().projectCommands;
  },

  removeProject: (repoPath: string) => {
    set((state) => {
      const projectCommands = { ...state.projectCommands };
      delete projectCommands[repoPath];
      return {
        projectCommands,
        ...(state.activeProjectPath === repoPath
          ? { activeProjectPath: null }
          : {}),
      };
    });
  },

  setCommandStatus: (name: string, status: CommandStatus) => {
    const path = get().activeProjectPath;
    if (!path) return;
    get().setCommandStatusForProject(path, name, status);
  },

  setCommandPtyId: (name: string, ptyId: number | null) => {
    const path = get().activeProjectPath;
    if (!path) return;
    get().setCommandPtyIdForProject(path, name, ptyId);
  },

  setCommandStatusForProject: (
    repoPath: string,
    name: string,
    status: CommandStatus,
  ) => {
    set((state) => {
      const commands = state.projectCommands[repoPath];
      if (!commands) return state;
      return {
        projectCommands: {
          ...state.projectCommands,
          [repoPath]: commands.map((c) =>
            c.name === name ? { ...c, status } : c,
          ),
        },
      };
    });
  },

  setCommandPtyIdForProject: (
    repoPath: string,
    name: string,
    ptyId: number | null,
  ) => {
    set((state) => {
      const commands = state.projectCommands[repoPath];
      if (!commands) return state;
      return {
        projectCommands: {
          ...state.projectCommands,
          [repoPath]: commands.map((c) =>
            c.name === name ? { ...c, ptyId } : c,
          ),
        },
      };
    });
  },
}));
