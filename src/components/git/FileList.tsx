import { useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import type { ChangedFile } from "../../lib/types";

interface FileListProps {
  files: ChangedFile[];
  selectedPath: string | null;
  selectedArea: string | null;
  onSelect: (file: ChangedFile) => void;
  onStage: (file: ChangedFile) => void;
  onUnstage: (file: ChangedFile) => void;
}

const STATUS_COLORS: Record<string, string> = {
  M: "rgb(96, 165, 250)",   // blue
  A: "rgb(74, 222, 128)",   // green
  D: "rgb(248, 113, 113)",  // red
  R: "rgb(192, 132, 252)",  // purple
  U: "rgb(251, 191, 36)",   // yellow
  "?": "rgb(148, 163, 184)", // gray
};

function fileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function fileDir(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/") + "/";
}

export default function FileList({
  files,
  selectedPath,
  selectedArea,
  onSelect,
  onStage,
  onUnstage,
}: FileListProps) {
  const grouped = useMemo(() => {
    const staged: ChangedFile[] = [];
    const unstaged: ChangedFile[] = [];
    const untracked: ChangedFile[] = [];
    for (const f of files) {
      if (f.area === "staged") staged.push(f);
      else if (f.area === "unstaged") unstaged.push(f);
      else untracked.push(f);
    }
    return { staged, unstaged, untracked };
  }, [files]);

  const sections = [
    { key: "staged", label: "STAGED", files: grouped.staged },
    { key: "unstaged", label: "UNSTAGED", files: grouped.unstaged },
    { key: "untracked", label: "UNTRACKED", files: grouped.untracked },
  ].filter((s) => s.files.length > 0);

  if (sections.length === 0) {
    return (
      <div className="git-panel__file-list">
        <div style={{ padding: 16, opacity: 0.5, fontSize: 12 }}>
          Working tree clean
        </div>
      </div>
    );
  }

  return (
    <div className="git-panel__file-list">
      {sections.map((section) => (
        <div key={section.key} style={{ marginBottom: 4 }}>
          <div className="section-label" style={{ padding: "8px 10px 4px" }}>
            {section.label}{" "}
            <span className="badge" style={{ marginLeft: 4 }}>
              {section.files.length}
            </span>
          </div>
          {section.files.map((file) => {
            const isSelected =
              file.path === selectedPath && file.area === selectedArea;
            return (
              <div
                key={`${file.area}:${file.path}`}
                className={`list-item file-item${isSelected ? " active" : ""}`}
                onClick={() => onSelect(file)}
              >
                <span
                  className="file-status-badge"
                  style={{ color: STATUS_COLORS[file.status] || STATUS_COLORS["?"] }}
                >
                  {file.status}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 500 }}>{fileName(file.path)}</span>
                  {fileDir(file.path) && (
                    <span style={{ opacity: 0.45, marginLeft: 4, fontSize: 11 }}>
                      {fileDir(file.path)}
                    </span>
                  )}
                </span>
                <button
                  className="icon-btn file-action"
                  title={file.area === "staged" ? "Unstage" : "Stage"}
                  onClick={(e) => {
                    e.stopPropagation();
                    file.area === "staged" ? onUnstage(file) : onStage(file);
                  }}
                >
                  {file.area === "staged" ? <Minus size={13} /> : <Plus size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
