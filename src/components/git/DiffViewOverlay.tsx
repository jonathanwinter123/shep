import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { useUIStore } from "../../stores/useUIStore";
import { gitFileDiff } from "../../lib/tauri";
import DiffViewer from "./DiffViewer";

export default function DiffViewOverlay() {
  const activeProjectPath = useTerminalStore((s) => s.activeProjectPath);
  const activeDiffFile = useUIStore((s) => s.activeDiffFile);

  const [diffContent, setDiffContent] = useState<string>("");

  const path = activeDiffFile?.path ?? null;
  const area = activeDiffFile?.area ?? null;
  const staged = area === "staged";

  // Fetch diff when the selected file changes
  useEffect(() => {
    if (!activeProjectPath || !path) {
      setDiffContent("");
      return;
    }
    const repo = activeProjectPath;
    let cancelled = false;
    setDiffContent("");
    void (async () => {
      try {
        const diff = await gitFileDiff(repo, path, staged);
        if (!cancelled) setDiffContent(diff);
      } catch {
        // Silently show empty diff on error.
      }
    })();
    return () => { cancelled = true; };
  }, [activeProjectPath, path, staged]);

  // Live-refresh while this overlay is open
  useEffect(() => {
    if (!activeProjectPath || !path) return;
    const repo = activeProjectPath;
    const unlistenP = listen<{ paths: string[] }>("git-fs-changed", async (event) => {
      if (!event.payload.paths.includes(repo)) return;
      try {
        const diff = await gitFileDiff(repo, path, staged);
        setDiffContent(diff);
      } catch {
        // Silent.
      }
    });
    return () => { unlistenP.then((f) => f()); };
  }, [activeProjectPath, path, staged]);

  if (!path) return null;

  const filename = path.split("/").pop() ?? path;
  const areaLabel = area === "staged" ? "staged" : area === "untracked" ? "untracked" : "unstaged";

  return (
    <div className="diff-overlay">
      <div className="diff-overlay__header">
        <span className="diff-overlay__filename">{filename}</span>
        <span className="diff-overlay__path">{path}</span>
        <span className="diff-overlay__area">{areaLabel}</span>
        <button
          className="diff-overlay__close"
          onClick={() => useUIStore.getState().deactivateAllOverlays()}
          title="Close (Esc)"
          aria-label="Close diff view"
        >
          <X size={14} />
        </button>
      </div>
      <div className="diff-overlay__body">
        <DiffViewer
          key={`${path}:${area}`}
          diff={diffContent}
          filePath={path}
        />
      </div>
    </div>
  );
}
