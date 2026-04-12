import { useCallback, useMemo } from "react";
import { ChevronDown, ChevronRight, File as FileIcon, Folder } from "lucide-react";
import { renderSearchHighlight } from "./searchHighlight";

/** Change classification for a node in the tree. `added` covers untracked
 *  and newly-staged files (rendered green); `modified` covers existing
 *  files with edits and folders that contain any changed descendants
 *  (rendered in the theme's attention/dirty color). */
export type ChangeKind = "added" | "modified" | null;

export interface FileTreeProps {
  /** Flat list of repo-relative paths to render. */
  files: string[];
  /** Map of repo-relative paths to their change kind. Files not in the
   *  map render without any change indicator. Folders derive their kind
   *  from descendants at tree-build time. */
  changedPaths: Map<string, Exclude<ChangeKind, null>>;
  /** Paths that are not yet tracked by git (status `?`). Rendered with a
   *  dimmed name so the eye can distinguish "new on disk, not in git yet"
   *  from "new and already staged" even though both are colored green. */
  untrackedPaths: Set<string>;
  /** Filter term. When non-empty, only files whose path contains the
   *  (case-insensitive) substring are shown, and every matching file's
   *  ancestor folders are auto-expanded so matches are immediately visible. */
  search: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedPaths: string[];
  onExpandedChange: (expanded: string[]) => void;
}

interface TreeNode {
  name: string;
  /** full repo-relative path; "" for the synthetic root */
  path: string;
  /** undefined = file, Map = directory */
  children?: Map<string, TreeNode>;
  /** `added` / `modified` / null (no change) — for files, taken directly
   *  from changedPaths; for folders, the most-severe kind among descendants
   *  (modified dominates added since folders with modified descendants are
   *  more important to surface). */
  changeKind: ChangeKind;
  /** True if this file is untracked (status `?`). Only meaningful for
   *  leaf nodes; folders always false. */
  untracked: boolean;
}

/**
 * Build a nested tree from a flat list of repo-relative paths. Children are
 * sorted at build time so the tree renders in stable order without
 * per-row sorting: directories first, then files, both alphabetical. Also
 * marks each node with a `changeKind` (added | modified | null) and each
 * file with an `untracked` flag — both propagate upward into folder
 * aggregation for `changeKind` (modified dominates added).
 */
function buildTree(
  paths: string[],
  changedPaths: Map<string, Exclude<ChangeKind, null>>,
  untrackedPaths: Set<string>,
): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    children: new Map(),
    changeKind: null,
    untracked: false,
  };
  for (const path of paths) {
    const parts = path.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLeaf = i === parts.length - 1;
      if (!node.children) node.children = new Map();
      if (!node.children.has(name)) {
        const fullPath = parts.slice(0, i + 1).join("/");
        node.children.set(name, {
          name,
          path: fullPath,
          children: isLeaf ? undefined : new Map(),
          changeKind: null,
          untracked: false,
        });
      }
      node = node.children.get(name)!;
    }
  }
  sortTree(root);
  markChanges(root, changedPaths, untrackedPaths);
  return root;
}

function sortTree(node: TreeNode): void {
  if (!node.children) return;
  const entries = Array.from(node.children.entries());
  entries.sort(([, a], [, b]) => {
    const aDir = !!a.children;
    const bDir = !!b.children;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children = new Map(entries);
  for (const child of node.children.values()) sortTree(child);
}

/** Recursively compute `changeKind` for each node. For files, it's a
 *  direct lookup in `changedPaths`; for folders, the most-severe kind
 *  among descendants (modified > added > null). Returns the node's own
 *  kind for the caller to aggregate. Also flags untracked files. */
function markChanges(
  node: TreeNode,
  changedPaths: Map<string, Exclude<ChangeKind, null>>,
  untrackedPaths: Set<string>,
): ChangeKind {
  if (!node.children) {
    node.changeKind = changedPaths.get(node.path) ?? null;
    node.untracked = untrackedPaths.has(node.path);
    return node.changeKind;
  }
  let best: ChangeKind = null;
  for (const child of node.children.values()) {
    const kind = markChanges(child, changedPaths, untrackedPaths);
    if (kind === "modified") best = "modified";
    else if (kind === "added" && best !== "modified") best = "added";
  }
  node.changeKind = best;
  return best;
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  search: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function TreeRow({ node, depth, expanded, selected, search, onToggle, onSelect }: TreeRowProps) {
  const isDir = !!node.children;
  const isExpanded = expanded.has(node.path);
  const isSelected = !isDir && selected === node.path;

  const handleClick = () => {
    if (isDir) onToggle(node.path);
    else onSelect(node.path);
  };

  const classes = [
    "list-item",
    "tree-row",
    isSelected ? "active" : "",
    node.changeKind === "added" ? "tree-row--added" : "",
    node.changeKind === "modified" ? "tree-row--modified" : "",
    node.untracked ? "tree-row--untracked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={classes}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={handleClick}
        title={node.path}
      >
        {isDir ? (
          isExpanded ? (
            <ChevronDown size={13} className="tree-row__chevron" />
          ) : (
            <ChevronRight size={13} className="tree-row__chevron" />
          )
        ) : (
          <span className="tree-row__chevron" />
        )}
        {isDir ? (
          <Folder size={14} className="tree-row__icon" />
        ) : (
          <FileIcon size={14} className="tree-row__icon" />
        )}
        <span className="tree-row__name">{renderSearchHighlight(node.name, search)}</span>
      </div>
      {isDir &&
        isExpanded &&
        node.children &&
        Array.from(node.children.values()).map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            selected={selected}
            search={search}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

/**
 * Pure presentation component for a file tree. All state lives in the
 * parent — this component just builds the tree structure from the file
 * list (memoized) and renders rows. Used by GitPanel's Files mode to
 * display the full repo browser tree. Shares visual styling with the
 * `.file-item` rows from FileList via the `.list-item` base class plus
 * `.tree-row*` modifiers.
 */
export default function FileTree({
  files,
  changedPaths,
  untrackedPaths,
  search,
  selectedPath,
  onSelect,
  expandedPaths,
  onExpandedChange,
}: FileTreeProps) {
  // Convert the lifted expandedPaths array to a Set for the tree's lookup.
  const expanded = useMemo(() => new Set(expandedPaths), [expandedPaths]);

  // Filter the flat path list by search before building the tree. Empty
  // search returns all files. Case-insensitive substring match on the full
  // repo-relative path so "foo/bar" matches "src/foo/components/bar.tsx".
  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files;
    const needle = search.trim().toLowerCase();
    return files.filter((p) => p.toLowerCase().includes(needle));
  }, [files, search]);

  const tree = useMemo(
    () => buildTree(filteredFiles, changedPaths, untrackedPaths),
    [filteredFiles, changedPaths, untrackedPaths],
  );

  // When actively searching, auto-expand every folder in the filtered
  // result so matches are immediately visible without manual clicking.
  // Uses a derived Set so it doesn't fight user toggles when search is cleared.
  const effectiveExpanded = useMemo(() => {
    if (!search.trim()) return expanded;
    const all = new Set<string>(expanded);
    for (const path of filteredFiles) {
      const parts = path.split("/");
      for (let i = 1; i < parts.length; i++) {
        all.add(parts.slice(0, i).join("/"));
      }
    }
    return all;
  }, [expanded, filteredFiles, search]);

  const handleToggle = useCallback(
    (path: string) => {
      const next = new Set(expanded);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      onExpandedChange(Array.from(next));
    },
    [expanded, onExpandedChange],
  );

  if (!tree.children || tree.children.size === 0) {
    return (
      <div className="repo-browser__tree">
        <div style={{ padding: 16, opacity: 0.5, fontSize: 12 }}>
          {search ? "No matches" : "No files to browse"}
        </div>
      </div>
    );
  }

  return (
    <div className="repo-browser__tree">
      {Array.from(tree.children.values()).map((child) => (
        <TreeRow
          key={child.path}
          node={child}
          depth={0}
          expanded={effectiveExpanded}
          selected={selectedPath}
          search={search}
          onToggle={handleToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
