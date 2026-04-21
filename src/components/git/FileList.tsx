import { useMemo } from "react";
import type { ChangedFile } from "../../lib/types";
import { renderSearchHighlight } from "./searchHighlight";

interface FileListProps {
  files: ChangedFile[];
  search: string;
  selectedPath: string | null;
  onSelect: (file: ChangedFile) => void;
}

const STATUS_LABEL: Record<string, string> = {
  M: "modified",
  A: "added",
  D: "deleted",
  R: "renamed",
  U: "unmerged",
  "?": "untracked",
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
  search,
  selectedPath,
  onSelect,
}: FileListProps) {
  const sortedFiles = useMemo(
    () =>
      [...files].sort((a, b) => {
        if (a.path === b.path) return a.status.localeCompare(b.status);
        return a.path.localeCompare(b.path);
      }),
    [files],
  );

  if (sortedFiles.length === 0) {
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
      {sortedFiles.map((file) => {
        const isSelected = file.path === selectedPath;
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
              <span className="file-item__name">
                {renderSearchHighlight(fmt.name, search)}
              </span>
              {fmt.parent && (
                <span className="file-item__parent">
                  {renderSearchHighlight(fmt.parent, search)}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
