import { create } from "zustand";

/**
 * UI state for the Git panel that needs to survive tab switches. GitPanel
 * is conditionally rendered in AppShell, so when you leave the Git tab the
 * component unmounts and any local useState is lost. This store keeps the
 * per-repo selection (Diffs selection, Repo selection, expanded folders,
 * search filter) around so switching tabs or toggling between Diffs/Repo
 * modes brings you back to where you were.
 *
 * State is keyed by repo path so multi-project users keep separate
 * selections per project. Transient state (fetched content, loading,
 * errors) stays inside the component — only the things worth remembering
 * live here.
 *
 * Global UI preferences (panelMode, viewMode) live in localStorage via
 * GitPanel's initial useState; they're cross-repo and cross-session.
 */

export interface ProjectPanelState {
  /** Diffs-mode selection (the file clicked in the changed files list). */
  diffsSelectedPath: string | null;
  diffsSelectedArea: string | null;
  /** Git status letter (M/A/D/R/U/?) of the diffs-mode selection, needed
   *  for deriving which file source to read on restore without having to
   *  wait for the changed-files list to repopulate first. */
  diffsSelectedStatus: string | null;
  /** Repo-mode selection (the file clicked in the browser tree). */
  repoSelectedPath: string | null;
  /** Expanded folder paths in the repo-mode tree. Stored as an array for
   *  Zustand serialization friendliness; converted to Set at read time. */
  repoExpanded: string[];
  /** Current left-panel search term. Persists across Diffs/Repo toggles
   *  so typing a filter in one mode carries over to the other. */
  leftSearch: string;
  /** Whether the left sidebar (file list/tree + commit area) is hidden
   *  so the viewer can take the full panel width. */
  sidebarCollapsed: boolean;
}

const DEFAULT_STATE: ProjectPanelState = {
  diffsSelectedPath: null,
  diffsSelectedArea: null,
  diffsSelectedStatus: null,
  repoSelectedPath: null,
  repoExpanded: [],
  leftSearch: "",
  sidebarCollapsed: false,
};

interface GitPanelStore {
  perRepo: Record<string, ProjectPanelState>;
  setDiffsSelection: (
    repo: string,
    path: string | null,
    area: string | null,
    status: string | null,
  ) => void;
  setRepoSelection: (repo: string, path: string | null) => void;
  setRepoExpanded: (repo: string, expanded: string[]) => void;
  setLeftSearch: (repo: string, search: string) => void;
  setSidebarCollapsed: (repo: string, collapsed: boolean) => void;
  clearSelection: (repo: string) => void;
}

export const useGitPanelStore = create<GitPanelStore>((set) => ({
  perRepo: {},

  setDiffsSelection: (repo, path, area, status) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          diffsSelectedPath: path,
          diffsSelectedArea: area,
          diffsSelectedStatus: status,
        },
      },
    })),

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

  clearSelection: (repo) =>
    set((state) => ({
      perRepo: {
        ...state.perRepo,
        [repo]: {
          ...(state.perRepo[repo] ?? DEFAULT_STATE),
          diffsSelectedPath: null,
          diffsSelectedArea: null,
          diffsSelectedStatus: null,
          repoSelectedPath: null,
        },
      },
    })),
}));

export function getPanelState(repo: string | null): ProjectPanelState {
  if (!repo) return DEFAULT_STATE;
  return useGitPanelStore.getState().perRepo[repo] ?? DEFAULT_STATE;
}
