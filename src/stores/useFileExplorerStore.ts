import { create } from "zustand";
import type { FileEntry, FileContents } from "../lib/types";
import { listDirectory, readFileContents } from "../lib/tauri";

interface FileExplorerStore {
  // Directory listing cache, keyed by directory path
  entries: Record<string, FileEntry[]>;
  // Expanded directory paths per project
  expandedDirs: Record<string, Set<string>>;
  // Currently loading directories
  loading: Record<string, boolean>;
  // File preview state
  previewFile: FileContents | null;
  previewLoading: boolean;
  previewError: string | null;

  loadDirectory: (dirPath: string, depth: number) => Promise<void>;
  toggleDir: (projectPath: string, dirPath: string) => Promise<void>;
  openPreview: (filePath: string) => Promise<void>;
  closePreview: () => void;
  clearProject: (projectPath: string) => void;
}

const MAX_PREVIEW_BYTES = 524288; // 512KB

export const useFileExplorerStore = create<FileExplorerStore>((set, get) => ({
  entries: {},
  expandedDirs: {},
  loading: {},
  previewFile: null,
  previewLoading: false,
  previewError: null,

  loadDirectory: async (dirPath: string, depth: number) => {
    set((s) => ({ loading: { ...s.loading, [dirPath]: true } }));
    try {
      const result = await listDirectory(dirPath, depth);
      set((s) => ({
        entries: { ...s.entries, [dirPath]: result },
        loading: { ...s.loading, [dirPath]: false },
      }));
    } catch {
      set((s) => ({ loading: { ...s.loading, [dirPath]: false } }));
    }
  },

  toggleDir: async (projectPath: string, dirPath: string) => {
    const { expandedDirs, entries } = get();
    const projectExpanded = expandedDirs[projectPath] ?? new Set<string>();
    const isExpanded = projectExpanded.has(dirPath);

    if (isExpanded) {
      const next = new Set(projectExpanded);
      next.delete(dirPath);
      set((s) => ({
        expandedDirs: { ...s.expandedDirs, [projectPath]: next },
      }));
    } else {
      const next = new Set(projectExpanded);
      next.add(dirPath);
      set((s) => ({
        expandedDirs: { ...s.expandedDirs, [projectPath]: next },
      }));

      if (!entries[dirPath]) {
        await get().loadDirectory(dirPath, 1);
      }
    }
  },

  openPreview: async (filePath: string) => {
    set({ previewLoading: true, previewError: null });
    try {
      const result = await readFileContents(filePath, MAX_PREVIEW_BYTES);
      set({ previewFile: result, previewLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ previewFile: null, previewLoading: false, previewError: message });
    }
  },

  closePreview: () => {
    set({ previewFile: null, previewError: null });
  },

  clearProject: (projectPath: string) => {
    set((s) => {
      const entries = { ...s.entries };
      const expandedDirs = { ...s.expandedDirs };
      for (const key of Object.keys(entries)) {
        if (key.startsWith(projectPath)) {
          delete entries[key];
        }
      }
      delete expandedDirs[projectPath];
      return { entries, expandedDirs, previewFile: null, previewError: null };
    });
  },
}));
