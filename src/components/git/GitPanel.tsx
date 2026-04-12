import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Upload, Search, X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useGitStore } from "../../stores/useGitStore";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitPanelStore } from "../../stores/useGitPanelStore";
import {
  gitChangedFiles, gitFileDiff, gitFileContents, gitListFiles,
  gitStageFile, gitUnstageAll, gitUnstageFile,
  gitStageAll, gitCommit, gitPushBranch,
} from "../../lib/tauri";
import type { ChangedFile } from "../../lib/types";
import FileList from "./FileList";
import FileTree from "./FileTree";
import DiffViewer from "./DiffViewer";
import FileViewer from "./FileViewer";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { getErrorMessage } from "../../lib/errors";

type PanelMode = "diffs" | "files";
const PANEL_MODE_KEY = "shep:gitPanelMode";

export default function GitPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const refreshStatus = useGitStore((s) => s.refreshStatus);
  const pushNotice = useNoticeStore((s) => s.pushNotice);

  const gitStatus = useGitStore(
    (s) => activeProjectPath ? s.projectGitStatus[activeProjectPath] ?? null : null,
  );

  // Persistent per-repo UI state lives in useGitPanelStore so it survives
  // GitPanel unmounts (switching tabs or navigating away and back).
  const panelState = useGitPanelStore((s) =>
    activeProjectPath ? s.perRepo[activeProjectPath] ?? null : null,
  );
  const selectedPath = panelState?.diffsSelectedPath ?? null;
  const selectedArea = panelState?.diffsSelectedArea ?? null;
  const repoSelectedPath = panelState?.repoSelectedPath ?? null;
  const repoExpanded = useMemo(
    () => panelState?.repoExpanded ?? [],
    [panelState?.repoExpanded],
  );
  const leftSearch = panelState?.leftSearch ?? "";

  // Transient local state — reset on every mount, no need to persist.
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [diffContent, setDiffContent] = useState<string>("");
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [repoFileContent, setRepoFileContent] = useState<string>("");
  const [repoFileError, setRepoFileError] = useState<string | null>(null);
  const [repoFileLoading, setRepoFileLoading] = useState<boolean>(false);

  // Panel mode persists via localStorage, with backwards compat for the
  // old "repo" value (renamed to "files" in the UI).
  const [panelMode, setPanelMode] = useState<PanelMode>(() => {
    const stored = localStorage.getItem(PANEL_MODE_KEY);
    return stored === "files" || stored === "repo" ? "files" : "diffs";
  });

  // A single unified search term (`leftSearch`, persisted in the panel
  // store) drives both the sidebar file filter AND the in-viewer
  // find-in-file highlight. One always-visible input, two effects.
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const canLoadGitFiles = !!activeProjectPath && !!gitStatus?.is_git_repo;
  const currentBranch = gitStatus?.branch ?? "";

  // ── Diffs mode: fetch changed files ───────────────────────────────
  const fetchFiles = useCallback(async () => {
    if (!canLoadGitFiles || !activeProjectPath) {
      setFiles([]);
      return;
    }
    try {
      const result = await gitChangedFiles(activeProjectPath);
      setFiles(result);
    } catch (error) {
      setFiles([]);
      pushNotice({ tone: "error", title: "Couldn't load changed files", message: getErrorMessage(error) });
    }
  }, [canLoadGitFiles, activeProjectPath, pushNotice]);

  const statusKey = gitStatus
    ? `${gitStatus.staged}:${gitStatus.unstaged}:${gitStatus.untracked}`
    : "";
  useEffect(() => { fetchFiles(); }, [fetchFiles, statusKey]);

  // ── Diffs mode: fetch diff content on selection change ─────────────
  useEffect(() => {
    if (!activeProjectPath || !selectedPath || !selectedArea) {
      setDiffContent("");
      return;
    }
    const repo = activeProjectPath;
    const path = selectedPath;
    const staged = selectedArea === "staged";

    let cancelled = false;
    setDiffContent("");
    void (async () => {
      try {
        const diff = await gitFileDiff(repo, path, staged);
        if (!cancelled) setDiffContent(diff);
      } catch (error) {
        if (!cancelled) {
          pushNotice({
            tone: "error",
            title: "Couldn't load diff",
            message: getErrorMessage(error),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectPath, selectedPath, selectedArea, pushNotice]);

  // ── Diffs mode: watcher refresh for the open diff ──────────────────
  useEffect(() => {
    if (!activeProjectPath || !selectedPath || !selectedArea) return;
    const repo = activeProjectPath;
    const path = selectedPath;
    const staged = selectedArea === "staged";

    const unlistenPromise = listen<{ paths: string[] }>("git-fs-changed", async (event) => {
      if (!event.payload.paths.includes(repo)) return;
      try {
        const diff = await gitFileDiff(repo, path, staged);
        setDiffContent(diff);
      } catch {
        // File may have been committed away — silent ignore.
      }
    });
    return () => {
      unlistenPromise.then((f) => f());
    };
  }, [activeProjectPath, selectedPath, selectedArea]);

  // ── Files mode: fetch repo file list ───────────────────────────────
  useEffect(() => {
    if (!activeProjectPath) {
      setRepoFiles([]);
      return;
    }
    const repo = activeProjectPath;
    let cancelled = false;
    void (async () => {
      try {
        const result = await gitListFiles(repo);
        if (!cancelled) setRepoFiles(result);
      } catch (error) {
        if (!cancelled) {
          setRepoFiles([]);
          pushNotice({
            tone: "error",
            title: "Couldn't list repo files",
            message: getErrorMessage(error),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectPath, pushNotice]);

  // ── Files mode: watcher refresh for the repo file list ────────────
  useEffect(() => {
    if (!activeProjectPath) return;
    const repo = activeProjectPath;
    const unlistenPromise = listen<{ paths: string[] }>("git-fs-changed", async (event) => {
      if (!event.payload.paths.includes(repo)) return;
      try {
        const result = await gitListFiles(repo);
        setRepoFiles(result);
      } catch {
        // Silent — initial fetch already pushed an error notice if needed.
      }
    });
    return () => {
      unlistenPromise.then((f) => f());
    };
  }, [activeProjectPath]);

  // ── Files mode: fetch file contents on selection change ────────────
  useEffect(() => {
    if (!activeProjectPath || !repoSelectedPath) {
      setRepoFileContent("");
      setRepoFileError(null);
      return;
    }
    const repo = activeProjectPath;
    const path = repoSelectedPath;
    let cancelled = false;
    setRepoFileContent("");
    setRepoFileError(null);
    setRepoFileLoading(true);
    void (async () => {
      try {
        const content = await gitFileContents(repo, path, "working");
        if (!cancelled) setRepoFileContent(content);
      } catch (error) {
        if (!cancelled) setRepoFileError(getErrorMessage(error));
      } finally {
        if (!cancelled) setRepoFileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectPath, repoSelectedPath]);

  // ── Files mode: watcher refresh for the open file contents ────────
  useEffect(() => {
    if (!activeProjectPath || !repoSelectedPath) return;
    const repo = activeProjectPath;
    const path = repoSelectedPath;
    const unlistenPromise = listen<{ paths: string[] }>("git-fs-changed", async (event) => {
      if (!event.payload.paths.includes(repo)) return;
      try {
        const content = await gitFileContents(repo, path, "working");
        setRepoFileContent(content);
        setRepoFileError(null);
      } catch (error) {
        setRepoFileError(getErrorMessage(error));
      }
    });
    return () => {
      unlistenPromise.then((f) => f());
    };
  }, [activeProjectPath, repoSelectedPath]);

  // Cmd+F (or Ctrl+F) focuses the always-visible unified search input.
  // Listener is only bound while GitPanel is mounted.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const refreshAfterChange = useCallback(async () => {
    if (!activeProjectPath) return;
    await fetchFiles();
    await refreshStatus(activeProjectPath);
  }, [activeProjectPath, fetchFiles, refreshStatus]);

  const handleSelect = useCallback(
    (file: ChangedFile) => {
      if (!activeProjectPath) return;
      useGitPanelStore.getState().setDiffsSelection(
        activeProjectPath,
        file.path,
        file.area,
        file.status,
      );
    },
    [activeProjectPath],
  );

  const handleSetPanelMode = useCallback((mode: PanelMode) => {
    setPanelMode(mode);
    localStorage.setItem(PANEL_MODE_KEY, mode);
  }, []);

  const handleSetLeftSearch = useCallback(
    (value: string) => {
      if (!activeProjectPath) return;
      useGitPanelStore.getState().setLeftSearch(activeProjectPath, value);
    },
    [activeProjectPath],
  );

  const handleRepoSelect = useCallback(
    (path: string) => {
      if (!activeProjectPath) return;
      useGitPanelStore.getState().setRepoSelection(activeProjectPath, path);
    },
    [activeProjectPath],
  );

  const handleRepoExpandedChange = useCallback(
    (expanded: string[]) => {
      if (!activeProjectPath) return;
      useGitPanelStore.getState().setRepoExpanded(activeProjectPath, expanded);
    },
    [activeProjectPath],
  );

  const handleStage = useCallback(
    async (file: ChangedFile) => {
      if (!activeProjectPath) return;
      try {
        await gitStageFile(activeProjectPath, file.path);
        await refreshAfterChange();
      } catch (error) {
        pushNotice({ tone: "error", title: `Couldn't stage ${file.path}`, message: getErrorMessage(error) });
      }
    },
    [activeProjectPath, refreshAfterChange, pushNotice],
  );

  const handleUnstage = useCallback(
    async (file: ChangedFile) => {
      if (!activeProjectPath) return;
      try {
        await gitUnstageFile(activeProjectPath, file.path);
        await refreshAfterChange();
      } catch (error) {
        pushNotice({ tone: "error", title: `Couldn't unstage ${file.path}`, message: getErrorMessage(error) });
      }
    },
    [activeProjectPath, refreshAfterChange, pushNotice],
  );

  const handleStageAll = useCallback(async () => {
    if (!activeProjectPath) return;
    try {
      await gitStageAll(activeProjectPath);
      await refreshAfterChange();
    } catch (error) {
      pushNotice({ tone: "error", title: "Couldn't stage all", message: getErrorMessage(error) });
    }
  }, [activeProjectPath, refreshAfterChange, pushNotice]);

  const handleUnstageAll = useCallback(async () => {
    if (!activeProjectPath) return;
    try {
      await gitUnstageAll(activeProjectPath);
      await refreshAfterChange();
    } catch (error) {
      pushNotice({ tone: "error", title: "Couldn't unstage all", message: getErrorMessage(error) });
    }
  }, [activeProjectPath, refreshAfterChange, pushNotice]);

  const handleCommit = useCallback(async () => {
    if (!activeProjectPath || !commitMsg.trim() || committing) return;
    setCommitting(true);
    try {
      await gitCommit(activeProjectPath, commitMsg.trim());
      setCommitMsg("");
      useGitPanelStore.getState().clearSelection(activeProjectPath);
      setDiffContent("");
      await refreshAfterChange();
    } catch (error) {
      pushNotice({ tone: "error", title: "Commit failed", message: getErrorMessage(error) });
    } finally {
      setCommitting(false);
    }
  }, [activeProjectPath, commitMsg, committing, refreshAfterChange, pushNotice]);

  const handlePush = useCallback(async () => {
    if (!activeProjectPath || !currentBranch || pushing) return;
    setPushing(true);
    try {
      await gitPushBranch(activeProjectPath, currentBranch);
      await refreshStatus(activeProjectPath);
      pushNotice({ tone: "success", title: "Pushed", message: `${currentBranch} → origin` });
    } catch (error) {
      pushNotice({ tone: "error", title: "Push failed", message: getErrorMessage(error) });
    } finally {
      setPushing(false);
    }
  }, [activeProjectPath, currentBranch, pushing, refreshStatus, pushNotice]);

  // Classify each changed file into "added" (new: status A or ?) or
  // "modified" (everything else) for the repo-browser tree coloring.
  // Also build a set of untracked paths (status ?) so the tree can dim
  // their names to signal "not tracked by git yet".
  const changedPathsMap = useMemo(() => {
    const m = new Map<string, "added" | "modified">();
    for (const f of files) {
      const kind: "added" | "modified" =
        f.status === "A" || f.status === "?" ? "added" : "modified";
      m.set(f.path, kind);
    }
    return m;
  }, [files]);

  const untrackedPaths = useMemo(() => {
    const s = new Set<string>();
    for (const f of files) {
      if (f.status === "?") s.add(f.path);
    }
    return s;
  }, [files]);

  // Filter the changed files list for FileList based on the same lifted
  // leftSearch term. Empty search returns all files.
  const filteredFiles = useMemo(() => {
    if (!leftSearch.trim()) return files;
    const needle = leftSearch.trim().toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(needle));
  }, [files, leftSearch]);

  if (!activeProjectPath) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Select a project to view git status
      </div>
    );
  }

  if (!gitStatus?.is_git_repo) {
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        Not a git repository
      </div>
    );
  }

  const activeStatus = gitStatus;
  const stagedCount = files.filter((f) => f.area === "staged").length;
  const canCommit = stagedCount > 0 && commitMsg.trim().length > 0 && !committing;
  const showPush = activeStatus.ahead > 0;

  return (
    <div className="git-panel">
      {/* Single full-width header strip. Always-visible search is
          absolutely centered; Diffs/Files mode toggle sits on the right.
          Opaque background blocks scroll bleed from columns below. */}
      <div className="git-panel__header">
        <div className="git-panel__header-search">
          <Search size={12} className="git-panel__search-icon" />
          <input
            ref={searchInputRef}
            className="git-panel__search-input"
            type="text"
            placeholder="Search files, filter diffs…"
            value={leftSearch}
            onChange={(e) => handleSetLeftSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && leftSearch) {
                e.preventDefault();
                handleSetLeftSearch("");
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {leftSearch && (
            <button
              className="icon-btn git-panel__search-clear"
              onClick={() => handleSetLeftSearch("")}
              title="Clear (Esc)"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="view-toggle" role="tablist" aria-label="Panel mode">
          <button
            role="tab"
            aria-selected={panelMode === "diffs"}
            className={`view-toggle__btn${panelMode === "diffs" ? " view-toggle__btn--active" : ""}`}
            onClick={() => handleSetPanelMode("diffs")}
          >
            Diffs
          </button>
          <button
            role="tab"
            aria-selected={panelMode === "files"}
            className={`view-toggle__btn${panelMode === "files" ? " view-toggle__btn--active" : ""}`}
            onClick={() => handleSetPanelMode("files")}
          >
            Files
          </button>
        </div>
      </div>

      <div className="git-panel__body">
        <div className="git-panel__sidebar">
          {panelMode === "files" ? (
            <FileTree
              files={repoFiles}
              changedPaths={changedPathsMap}
              untrackedPaths={untrackedPaths}
              search={leftSearch}
              selectedPath={repoSelectedPath}
              onSelect={handleRepoSelect}
              expandedPaths={repoExpanded}
              onExpandedChange={handleRepoExpandedChange}
            />
          ) : (
            <FileList
              files={filteredFiles}
              selectedPath={selectedPath}
              selectedArea={selectedArea}
              onSelect={handleSelect}
              onStage={handleStage}
              onUnstage={handleUnstage}
              onStageAll={handleStageAll}
              onUnstageAll={handleUnstageAll}
            />
          )}

          {panelMode === "diffs" && (
            <div className="git-panel__commit">
              <textarea
                className="git-panel__commit-input"
                placeholder="Commit message"
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
                    e.preventDefault();
                    handleCommit();
                  }
                }}
                rows={2}
              />
              <div className="git-panel__commit-actions">
                <button
                  className="btn-primary git-panel__commit-btn"
                  disabled={!canCommit}
                  onClick={handleCommit}
                >
                  {committing ? "Committing…" : `Commit${stagedCount > 0 ? ` (${stagedCount})` : ""}`}
                </button>
                {showPush && (
                  <button
                    className="btn-ghost git-panel__push-btn"
                    onClick={handlePush}
                    disabled={pushing}
                    title={`Push ${activeStatus.ahead} commit${activeStatus.ahead > 1 ? "s" : ""} to origin`}
                  >
                    <Upload size={11} />
                    {pushing ? "Pushing…" : `Push ↑${activeStatus.ahead}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="git-panel__viewer-area">
          {/* Viewer content — mode-switched. */}
          {panelMode === "files" ? (
            repoSelectedPath ? (
              <FileViewer
                key={repoSelectedPath}
                contents={repoFileContent}
                filePath={repoSelectedPath}
                loading={repoFileLoading}
                error={repoFileError}
                findTerm={leftSearch}
              />
            ) : (
              <div className="git-panel__diff">
                <div style={{ padding: 24, opacity: 0.35, fontSize: 12 }}>
                  Select a file to view
                </div>
              </div>
            )
          ) : selectedPath ? (
            <DiffViewer
              key={selectedPath}
              diff={diffContent}
              filePath={selectedPath}
              findTerm={leftSearch}
            />
          ) : (
            <div className="git-panel__diff">
              <div style={{ padding: 24, opacity: 0.35, fontSize: 12 }}>
                Select a file to view
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
