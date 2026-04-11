import { useEffect, useMemo } from "react";
import { useFileExplorerStore } from "../../stores/useFileExplorerStore";
import { useUIStore } from "../../stores/useUIStore";
import FileTreeItem from "./FileTreeItem";
import type { FileEntry } from "../../lib/types";

interface FileTreeProps {
  repoPath: string;
}

const EMPTY_SET = new Set<string>();
const EMPTY_ENTRIES: FileEntry[] = [];

export default function FileTree({ repoPath }: FileTreeProps) {
  const entries = useFileExplorerStore((s) => s.entries);
  const expandedDirs = useFileExplorerStore(
    (s) => s.expandedDirs[repoPath] ?? EMPTY_SET,
  );
  const loading = useFileExplorerStore((s) => s.loading[repoPath] ?? false);
  const previewPath = useFileExplorerStore((s) => s.previewFile?.path ?? null);
  const loadDirectory = useFileExplorerStore((s) => s.loadDirectory);
  const toggleDir = useFileExplorerStore((s) => s.toggleDir);
  const openPreview = useFileExplorerStore((s) => s.openPreview);

  // Legitimate useEffect: one-time data fetch on mount when entries aren't cached
  useEffect(() => {
    if (!entries[repoPath]) {
      loadDirectory(repoPath, 2);
    }
  }, [repoPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleEntries = useMemo(() => {
    const rootEntries = entries[repoPath] ?? EMPTY_ENTRIES;
    if (rootEntries.length === 0) return EMPTY_ENTRIES;

    // Collect all entries from root and expanded directories
    const allMap = new Map<string, FileEntry>();
    for (const entry of rootEntries) {
      allMap.set(entry.path, entry);
    }
    for (const dirPath of expandedDirs) {
      const dirEntries = entries[dirPath];
      if (dirEntries) {
        for (const entry of dirEntries) {
          allMap.set(entry.path, entry);
        }
      }
    }

    // Sort by full path for tree order
    const sorted = Array.from(allMap.values()).sort((a, b) =>
      a.path.localeCompare(b.path),
    );

    // Filter: only show entries whose parent is repoPath or an expanded dir
    const filtered = sorted.filter((entry) => {
      const parentPath = entry.path.substring(
        0,
        entry.path.lastIndexOf("/"),
      );
      return parentPath === repoPath || expandedDirs.has(parentPath);
    });

    // Compute visual depth from relative path
    const repoPrefix = repoPath.length + 1;
    return filtered.map((entry) => {
      const relativePath = entry.path.slice(repoPrefix);
      const depth = relativePath.split("/").length - 1;
      return { ...entry, depth };
    });
  }, [entries, repoPath, expandedDirs]);

  if (loading && (!entries[repoPath] || entries[repoPath].length === 0)) {
    return <p className="text-xs opacity-40 pl-4">Loading...</p>;
  }

  if (!entries[repoPath] || entries[repoPath].length === 0) {
    return <p className="text-xs opacity-40 pl-4">No files</p>;
  }

  return (
    <>
      {visibleEntries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          isExpanded={expandedDirs.has(entry.path)}
          isPreviewActive={previewPath === entry.path}
          onClick={() => {
            if (entry.is_dir) {
              toggleDir(repoPath, entry.path);
            } else {
              useUIStore.getState().openFilePreview();
              openPreview(entry.path);
            }
          }}
        />
      ))}
    </>
  );
}
