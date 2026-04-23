import { create } from "zustand";

/**
 * UI state for the Git panel that needs to survive tab switches. GitPanel
 * is conditionally rendered in AppShell, so when you leave the Git tab the
 * component unmounts and any local useState is lost. This store keeps the
 * per-repo selection (Repo selection, expanded folders, search filter)
 * around so switching tabs brings you back to where you were.
 *
 * State is keyed by repo path so multi-project users keep separate
 * selections per project. Transient state (fetched content, loading,
 * errors) stays inside the component — only the things worth remembering
 * live here.
 *
 * Global overlay state lives in useUIStore.
 */

export interface ProjectPanelState {
  /** Repo-mode selection (the file clicked in the browser tree). */
  repoSelectedPath: string | null;
  /** Expanded folder paths in the repo-mode tree. Stored as an array for
   *  Zustand serialization friendliness; converted to Set at read time. */
  repoExpanded: string[];
  /** Current left-panel search term. */
  leftSearch: string;
  /** Whether the right pane is showing file contents or the selected file's diff. */
  viewerMode: "file" | "diff";
  /** Preferred diff area per path when a file has both staged and unstaged changes. */
  repoPreferredDiffArea: Record<string, "staged" | "unstaged" | "untracked">;
  /** Whether the left sidebar (file list/tree + commit area) is hidden
   *  so the viewer can take the full panel width. */
  sidebarCollapsed: boolean;
  /** Scroll position (scrollTop px) per file path in repo-mode viewer. */
  repoScrollPositions: Record<string, number>;
}

const DEFAULT_STATE: ProjectPanelState = {
  repoSelectedPath: null,
  repoExpanded: [],
  leftSearch: "",
  viewerMode: "file",
  repoPreferredDiffArea: {},
  sidebarCollapsed: false,
  repoScrollPositions: {},
};

interface GitPanelStore {
  perRepo: Record<string, ProjectPanelState>;
  setRepoSelection: (repo: string, path: string | null) => void;
  setRepoExpanded: (repo: string, expanded: string[]) => void;
  setLeftSearch: (repo: string, search: string) => void;
  setViewerMode: (repo: string, mode: "file" | "diff") => void;
  setRepoPreferredDiffArea: (
    repo: string,
    filePath: string,
    area: "staged" | "unstaged" | "untracked",
  ) => void;
  setSidebarCollapsed: (repo: string, collapsed: boolean) => void;
  setRepoScrollPosition: (repo: string, filePath: string, pos: number) => void;
}

export const useGitPanelStore = create<GitPanelStore>((set) => ({
  perRepo: {},

  setRepoSelection: (repo, path) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          repoSelectedPath: path,
        },
      },
    })),

  setRepoExpanded: (repo, expanded) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          repoExpanded: expanded,
        },
      },
    })),

  setLeftSearch: (repo, search) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          leftSearch: search,
        },
      },
    })),

  setViewerMode: (repo, mode) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          viewerMode: mode,
        },
      },
    })),

  setRepoPreferredDiffArea: (repo, filePath, area) =>
    set((state) => {
      const existing = state.perRepo[repo] ?? DEFAULT_STATE;
      return {
        perRepo: {
          ...state.perRepo,
          [repo]: {
            ...existing,
            repoPreferredDiffArea: {
              ...existing.repoPreferredDiffArea,
              [filePath]: area,
            },
          },
        },
      };
    }),

  setSidebarCollapsed: (repo, collapsed) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          sidebarCollapsed: collapsed,
        },
      },
    })),

  setRepoScrollPosition: (repo, filePath, pos) =>
    set((state) => {
      const existing = state.perRepo[repo] ?? DEFAULT_STATE;
      return {
        perRepo: {
          ...state.perRepo,
          [repo]: {
            ...existing,
            repoScrollPositions: { ...existing.repoScrollPositions, [filePath]: pos },
          },
        },
      };
    }),

}));
