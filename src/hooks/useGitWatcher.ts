import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { watchRepo, unwatchRepo } from "../lib/tauri";
import { useGitStore } from "../stores/useGitStore";

interface FsChangedPayload {
  paths: string[];
}

/**
 * Watches repo paths for git changes via file system events.
 * Also discovers and watches worktree paths from `git worktree list`.
 *
 * @param repoPaths - Main repo paths to watch (not worktree paths)
 */
export function useGitWatcher(repoPaths: string[]) {
  const prevMainRef = useRef<Set<string>>(new Set());
  const prevWorktreeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (repoPaths.length === 0) return;

    const { refreshAll, refreshWorktrees, getWorktreePaths } = useGitStore.getState();
    const currentMain = new Set(repoPaths);
    const prevMain = prevMainRef.current;

    // Watch newly added main repo paths
    for (const path of currentMain) {
      if (!prevMain.has(path)) void watchRepo(path);
    }
    // Unwatch removed main repo paths
    for (const path of prevMain) {
      if (!currentMain.has(path)) void unwatchRepo(path);
    }
    prevMainRef.current = currentMain;

    // Initial refresh: git status + worktree discovery
    refreshAll(repoPaths).then(() => {
      // After status is loaded, discover worktrees for each repo
      Promise.all(repoPaths.map((p) => refreshWorktrees(p))).then(() => {
        // Watch discovered worktree paths
        const wtPaths = new Set<string>();
        for (const repoPath of repoPaths) {
          for (const p of getWorktreePaths(repoPath)) wtPaths.add(p);
        }
        // Unwatch old worktree paths no longer present
        for (const p of prevWorktreeRef.current) {
          if (!wtPaths.has(p)) void unwatchRepo(p);
        }
        // Watch new worktree paths
        for (const p of wtPaths) {
          if (!prevWorktreeRef.current.has(p)) void watchRepo(p);
        }
        prevWorktreeRef.current = wtPaths;

        // Refresh git status for worktree paths
        if (wtPaths.size > 0) refreshAll([...wtPaths]);
      });
    });

    // Listen for file system change events from the backend watcher
    const unlisten = listen<FsChangedPayload>("git-fs-changed", (event) => {
      refreshAll(event.payload.paths);
      // Also refresh worktree lists if a main repo changed (new worktree may have been added)
      for (const changedPath of event.payload.paths) {
        if (currentMain.has(changedPath)) {
          refreshWorktrees(changedPath).then(() => {
            // Watch any newly discovered worktree paths
            const newWtPaths = getWorktreePaths(changedPath);
            for (const p of newWtPaths) {
              if (!prevWorktreeRef.current.has(p)) {
                void watchRepo(p);
                prevWorktreeRef.current.add(p);
                refreshAll([p]);
              }
            }
          });
        }
      }
    });

    return () => {
      unlisten.then((f) => f());
      // Unwatch all on cleanup
      for (const path of currentMain) void unwatchRepo(path);
      for (const path of prevWorktreeRef.current) void unwatchRepo(path);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPaths.join(",")]);
}
