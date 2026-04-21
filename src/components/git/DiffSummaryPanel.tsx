import { useState, useEffect, useCallback, useMemo } from "react";
import { Diff } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useGitStore } from "../../stores/useGitStore";
import { useUIStore } from "../../stores/useUIStore";
import { gitChangedFiles, gitDiffStats } from "../../lib/tauri";
import type { ChangedFile, DiffFileStat } from "../../lib/types";


function statusLabel(status: string): string {
  return status.toLowerCase();
}

function formatNum(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface TooltipState {
  file: ChangedFile;
  stat: DiffFileStat | undefined;
  rect: DOMRect;
}

function DiffTooltip({ tip }: { tip: TooltipState }) {
  const { file, stat } = tip;
  const top = tip.rect.top + tip.rect.height / 2;
  const right = window.innerWidth - tip.rect.left + 10;
  const filename = file.path.split("/").pop() ?? file.path;

  return (
    <div
      className="diff-strip__tooltip"
      style={{ top, right, transform: "translateY(-50%)" }}
    >
      <div className="diff-strip__tooltip-header">
        <span className="diff-strip__tooltip-filename">{filename}</span>
        <span className="diff-strip__tooltip-status" data-status={file.status}>
          {statusLabel(file.status)}
        </span>
      </div>
      {stat && (
        <div className="diff-strip__tooltip-rows">
          <div className="diff-strip__tooltip-row diff-strip__tooltip-row--add">
            <span>Added</span>
            <span>+{stat.additions}</span>
          </div>
          <div className="diff-strip__tooltip-row diff-strip__tooltip-row--del">
            <span>Removed</span>
            <span>−{stat.deletions}</span>
          </div>
        </div>
      )}
      <div className="diff-strip__tooltip-path">{file.path}</div>
    </div>
  );
}

export default function DiffSummaryPanel() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const gitStatus = useGitStore(
    (s) => (activeProjectPath ? s.projectGitStatus[activeProjectPath] ?? null : null),
  );
  const activeDiffFile = useUIStore((s) => s.activeDiffFile);

  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, DiffFileStat>>(new Map());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

  const handleFileClick = useCallback((file: ChangedFile) => {
    useUIStore.getState().openDiffFile(file.path, file.area);
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (!activeProjectPath || !gitStatus?.is_git_repo) return null;

  return (
    <div className="diff-strip" onMouseLeave={handleMouseLeave}>
      <div className="diff-strip__header">
        <Diff size={13} className="diff-strip__header-icon" />
        <span className="diff-strip__header-label">diffs</span>
      </div>
      <div className="diff-strip__list">
        {dedupedFiles.length === 0 ? (
          <div className="diff-strip__clean" title="Working tree clean">·</div>
        ) : (
          dedupedFiles.map((file) => {
            const stat = statsMap.get(file.path);
            const isActive = activeDiffFile?.path === file.path;
            const filename = file.path.split("/").pop() ?? file.path;
            const adds = stat?.additions ?? 0;
            const dels = stat?.deletions ?? 0;

            return (
              <button
                key={`${file.area}:${file.path}`}
                className={`diff-strip__row${isActive ? " diff-strip__row--active" : ""}`}
                data-status={file.status}
                onClick={() => handleFileClick(file)}
                aria-label={filename}
                onMouseEnter={(e) => setTooltip({ file, stat, rect: e.currentTarget.getBoundingClientRect() })}
              >
                <span className="diff-strip__pill">
                  <span className={`diff-strip__pill-half diff-strip__pill-half--add${adds > 0 ? "" : " diff-strip__pill-half--empty"}`}>
                    {adds > 0 ? `+${formatNum(adds)}` : ""}
                  </span>
                  <span className={`diff-strip__pill-half diff-strip__pill-half--del${dels > 0 ? "" : " diff-strip__pill-half--empty"}`}>
                    {dels > 0 ? `−${formatNum(dels)}` : ""}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      {dedupedFiles.length > 0 && (
        <div className="diff-strip__footer">
          <span className="diff-strip__footer-stat">
            {formatNum(dedupedFiles.length)} {dedupedFiles.length === 1 ? "file" : "files"}
          </span>
        </div>
      )}
      {tooltip && <DiffTooltip tip={tooltip} />}
    </div>
  );
}
