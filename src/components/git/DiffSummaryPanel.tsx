import { useState, useEffect, useCallback, useMemo } from "react";
import { Diff } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";
import { gitChangedFiles, gitDiffStats } from "../../lib/tauri";
import type { ChangedFile, DiffFileStat } from "../../lib/types";

const MAX_BAR_PX = 38;

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
    const vals = Array.from(byPath.values());
    return vals.sort((a, b) => {
      const sa = statsMap.get(a.path);
      const sb = statsMap.get(b.path);
      const ta = sa ? sa.additions + sa.deletions : 0;
      const tb = sb ? sb.additions + sb.deletions : 0;
      return tb - ta;
    });
  }, [files, statsMap]);

  // sqrt-scale bar lengths relative to the largest change in the set
  const maxSqrt = useMemo(() => {
    let max = 1;
    for (const f of dedupedFiles) {
      const s = statsMap.get(f.path);
      if (s) max = Math.max(max, Math.sqrt(s.additions + s.deletions));
    }
    return max;
  }, [dedupedFiles, statsMap]);

  const totals = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const f of dedupedFiles) {
      const s = statsMap.get(f.path);
      if (s) { additions += s.additions; deletions += s.deletions; }
    }
    return { additions, deletions };
  }, [dedupedFiles, statsMap]);

  const handleFileClick = useCallback((file: ChangedFile) => {
    useUIStore.getState().openDiffFile(file.path, file.area);
  }, []);

  if (!activeProjectPath || !gitStatus?.is_git_repo) return null;

  return (
    <div className="diff-strip">
      <div className="diff-strip__header">
        <Diff size={13} className="diff-strip__header-icon" />
      </div>
      <div className="diff-strip__list">
        {dedupedFiles.length === 0 ? (
          <div className="diff-strip__clean" title="Working tree clean">·</div>
        ) : (
          dedupedFiles.map((file) => {
            const stat = statsMap.get(file.path);
            const total = stat ? stat.additions + stat.deletions : 0;
            const barTotal = Math.round((Math.sqrt(total) / maxSqrt) * MAX_BAR_PX);
            const addPx = total > 0 && stat
              ? Math.max(1, Math.round(barTotal * stat.additions / total))
              : 0;
            const delPx = barTotal - addPx;
            const isActive = activeDiffFile?.path === file.path;

            const filename = file.path.split("/").pop() ?? file.path;
            const tooltip = stat
              ? `${file.path}  +${stat.additions} −${stat.deletions}`
              : file.path;

            return (
              <button
                key={`${file.area}:${file.path}`}
                className={`diff-strip__row${isActive ? " diff-strip__row--active" : ""}`}
                data-status={file.status}
                onClick={() => handleFileClick(file)}
                title={tooltip}
                aria-label={filename}
              >
                <span className="diff-strip__bar-wrap">
                  {total > 0 ? (
                    <>
                      {addPx > 0 && (
                        <span className="diff-strip__bar diff-strip__bar--add" style={{ width: addPx }} />
                      )}
                      {delPx > 0 && (
                        <span className="diff-strip__bar diff-strip__bar--del" style={{ width: delPx }} />
                      )}
                    </>
                  ) : (
                    <span className="diff-strip__bar diff-strip__bar--unknown" style={{ width: 10 }} />
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
      {dedupedFiles.length > 0 && (
        <div className="diff-strip__footer">
          <span className="diff-strip__footer-stat diff-strip__footer-stat--add">
            +{totals.additions}
          </span>
          <span className="diff-strip__footer-stat diff-strip__footer-stat--del">
            −{totals.deletions}
          </span>
        </div>
      )}
    </div>
  );
}
