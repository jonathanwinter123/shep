import { useEffect, useRef } from "react";
import { useGitStore } from "../stores/useGitStore";

const POLL_INTERVAL = 5_000;

export function useGitPolling(repoPaths: string[]) {
  const { refreshAll } = useGitStore.getState();
  const pathsRef = useRef(repoPaths);
  pathsRef.current = repoPaths;

  useEffect(() => {
    if (repoPaths.length === 0) return;

    // Immediate fetch
    refreshAll(repoPaths);

    const id = setInterval(() => {
      refreshAll(pathsRef.current);
    }, POLL_INTERVAL);

    return () => clearInterval(id);
    // Re-start polling when the repo list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPaths.join(","), refreshAll]);
}
