import { useState, useEffect, useCallback, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";
import { gitChangedFiles, gitDiffStats } from "../../lib/tauri";
import type { ChangedFile, DiffFileStat } from "../../lib/types";

export default function DiffSummaryPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const gitStatus = useGitStore(
    (s) => (activeProjectPath ? s.projectGitStatus[activeProjectPath] ?? null : null),
  );
  const activeDiffFile = useUIStore((s) => s.activeDiffFile);

  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, DiffFileStat>>(new Map());

  const canLoad = !!activeProjectPath && !!gitStatus?.is_git_repo;

  const fetchData = useCallback(async () => {
    if (!canLoad || !activeProjectPath) {
      setFiles([]);
      setStatsMap(new Map());
      return;
    }
    const [changedFiles, diffStats] = await Promise.all([
      gitChangedFiles(activeProjectPath).catch(() => [] as ChangedFile[]),
      gitDiffStats(activeProjectPath).catch(() => [] as DiffFileStat[]),
    ]);
    setFiles(changedFiles);
    const m = new Map<string, DiffFileStat>();
    for (const s of diffStats) m.set(s.path, s);
    setStatsMap(m);
  }, [canLoad, activeProjectPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!canLoad || !activeProjectPath) return;
    const repo = activeProjectPath;
    const unlistenP = listen<{ paths: string[] }>("git-fs-changed", async (event) => {
      if (!event.payload.paths.includes(repo)) return;
      await fetchData();
    });
    return () => { unlistenP.then((f) => f()); };
  }, [canLoad, activeProjectPath, fetchData]);

  const dedupedFiles = useMemo(() => {
    const priority = (area: string) => {
      if (area === "unstaged" || area === "untracked") return 2;
      if (area === "staged") return 1;
      return 0;
    };
    const byPath = new Map<string, ChangedFile>();
    for (const f of files) {
      const current = byPath.get(f.path);
      if (!current || priority(f.area) > priority(current.area)) {
        byPath.set(f.path, f);
      }
    }
    return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
  }, [files]);

  const handleFileClick = useCallback(
    (file: ChangedFile) => {
      useUIStore.getState().openDiffFile(file.path, file.area);
    },
    [],
  );

  if (!activeProjectPath || !gitStatus?.is_git_repo) return null;

  return (
    <div className="diff-summary-panel">
      <div className="diff-summary-panel__header">
        <span className="diff-summary-panel__title">Changes</span>
        {dedupedFiles.length > 0 && (
          <span className="diff-summary-panel__count">{dedupedFiles.length}</span>
        )}
      </div>
      <div className="diff-summary-panel__list">
        {dedupedFiles.length === 0 ? (
          <div className="diff-summary-panel__empty">Working tree clean</div>
        ) : (
          dedupedFiles.map((file) => {
            const stat = statsMap.get(file.path);
            const parts = file.path.split("/");
            const name = parts[parts.length - 1];
            const parent = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
            const isActive = activeDiffFile?.path === file.path;
            return (
              <button
                key={`${file.area}:${file.path}`}
                className={`diff-summary-panel__file${isActive ? " diff-summary-panel__file--active" : ""}`}
                onClick={() => handleFileClick(file)}
                title={file.path}
              >
                <span className="diff-summary-panel__status" data-status={file.status}>
                  {file.status}
                </span>
                <span className="diff-summary-panel__file-info">
                  <span className="diff-summary-panel__filename">{name}</span>
                  {parent && (
                    <span className="diff-summary-panel__parent">{parent}</span>
                  )}
                </span>
                {stat && (
                  <span className="diff-summary-panel__counts">
                    <span className="diff-summary-panel__add">+{stat.additions}</span>
                    <span className="diff-summary-panel__del">-{stat.deletions}</span>
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
