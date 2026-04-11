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
  onStageAll: () => void;
  onUnstageAll: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  M: "Modified",
  A: "Added",
  D: "Deleted",
  R: "Renamed",
  U: "Unmerged",
  "?": "Untracked",
};

/** Immediate parent dir + filename; empty parent for root-level files. */
function formatPath(path: string): { name: string; parent: string } {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  const parent = parts.length > 1 ? parts[parts.length - 2] : "";
  return { name, parent };
}

export default function FileList({
  files,
  selectedPath,
  selectedArea,
  onSelect,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
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

  const hasUnstaged = grouped.unstaged.length > 0 || grouped.untracked.length > 0;
  const hasStaged = grouped.staged.length > 0;

  const sections = [
    { key: "staged", label: "STAGED", files: grouped.staged, bulkAction: hasStaged ? onUnstageAll : undefined, bulkIcon: <Minus size={11} />, bulkTitle: "Unstage all" },
    { key: "unstaged", label: "CHANGES", files: [...grouped.unstaged, ...grouped.untracked], bulkAction: hasUnstaged ? onStageAll : undefined, bulkIcon: <Plus size={11} />, bulkTitle: "Stage all" },
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

  const singleSection = sections.length === 1;

  return (
    <div className="git-panel__file-list">
      {sections.map((section) => (
        <div key={section.key} style={{ marginBottom: 4 }}>
          <div className={`section-label${singleSection ? " section-label--minimal" : ""}`}>
            {!singleSection && (
              <>
                <span>{section.label}</span>
                <span className="badge" style={{ marginLeft: 2 }}>
                  {section.files.length}
                </span>
              </>
            )}
            <span style={{ flex: 1 }} />
            {section.bulkAction && (
              <button
                className="icon-btn"
                title={section.bulkTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  section.bulkAction!();
                }}
              >
                {section.bulkIcon}
              </button>
            )}
          </div>
          {section.files.map((file) => {
            const isSelected =
              file.path === selectedPath && file.area === selectedArea;
            const fmt = formatPath(file.path);
            const statusLabel = STATUS_LABEL[file.status] ?? "Changed";
            return (
              <div
                key={`${file.area}:${file.path}`}
                className={`list-item file-item${isSelected ? " active" : ""}`}
                data-status={file.status}
                title={`${statusLabel} · ${file.path}`}
                onClick={() => onSelect(file)}
              >
                <span className="file-status-bar" aria-hidden="true" />
                <span className="file-item__name-wrap">
                  <span className="file-item__name">{fmt.name}</span>
                  {fmt.parent && (
                    <span className="file-item__parent">{fmt.parent}</span>
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
