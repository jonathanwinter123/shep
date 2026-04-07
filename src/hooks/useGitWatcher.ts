import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { watchRepo, unwatchRepo } from "../lib/tauri";
import { useGitStore } from "../stores/useGitStore";

interface FsChangedPayload {
  paths: string[];
}

/**
 * Watches repo paths for git changes via file system events.
 * Each project (including worktrees added as separate projects) is watched independently.
 */
export function useGitWatcher(repoPaths: string[]) {
  const prevRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (repoPaths.length === 0) return;

    const { refreshAll } = useGitStore.getState();
    const current = new Set(repoPaths);
    const prev = prevRef.current;

    // Watch newly added paths
    for (const path of current) {
      if (!prev.has(path)) void watchRepo(path);
    }
    // Unwatch removed paths
    for (const path of prev) {
      if (!current.has(path)) void unwatchRepo(path);
    }
    prevRef.current = current;

    // Initial refresh
    refreshAll(repoPaths);

    // Listen for file system change events from the backend watcher
    const unlisten = listen<FsChangedPayload>("git-fs-changed", (event) => {
      refreshAll(event.payload.paths);
    });

    return () => {
      unlisten.then((f) => f());
      for (const path of current) void unwatchRepo(path);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPaths.join(",")]);
}
