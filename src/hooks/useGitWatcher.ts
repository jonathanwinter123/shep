import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { watchRepo, unwatchRepo } from "../lib/tauri";
import { useGitStore } from "../stores/useGitStore";

interface FsChangedPayload {
  paths: string[];
}

export function useGitWatcher(repoPaths: string[]) {
  const { refreshAll } = useGitStore.getState();
  const prevPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (repoPaths.length === 0) return;

    const currentSet = new Set(repoPaths);
    const prevSet = prevPathsRef.current;

    // Watch newly added paths
    for (const path of currentSet) {
      if (!prevSet.has(path)) {
        void watchRepo(path);
      }
    }

    // Unwatch removed paths
    for (const path of prevSet) {
      if (!currentSet.has(path)) {
        void unwatchRepo(path);
      }
    }

    prevPathsRef.current = currentSet;

    // Immediate refresh on mount / path change
    refreshAll(repoPaths);

    // Listen for file system change events from the backend watcher
    const unlisten = listen<FsChangedPayload>("git-fs-changed", (event) => {
      refreshAll(event.payload.paths);
    });

    return () => {
      unlisten.then((f) => f());
      // Unwatch all on cleanup
      for (const path of currentSet) {
        void unwatchRepo(path);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPaths.join(","), refreshAll]);
}
