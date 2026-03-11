import { invoke, Channel } from "@tauri-apps/api/core";
import type {
  RepoInfo,
  WorkspaceConfig,
  PtyOutput,
  GitStatus,
  ChangedFile,
  WorktreeEntry,
  EditorSettings,
  PreferredEditor,
} from "./types";

// ── Workspace commands ──────────────────────────────────────────────

export function listRepos(): Promise<RepoInfo[]> {
  return invoke("list_repos");
}

export function registerRepo(repoPath: string): Promise<WorkspaceConfig> {
  return invoke("register_repo", { repoPath });
}

export function unregisterRepo(repoPath: string): Promise<void> {
  return invoke("unregister_repo", { repoPath });
}

export function loadWorkspace(repoPath: string): Promise<WorkspaceConfig> {
  return invoke("load_workspace", { repoPath });
}

export function saveWorkspace(
  repoPath: string,
  config: WorkspaceConfig,
): Promise<void> {
  return invoke("save_workspace", { repoPath, config });
}

export function getEditorSettings(): Promise<EditorSettings> {
  return invoke("get_editor_settings");
}

export function saveEditorSettings(settings: EditorSettings): Promise<void> {
  return invoke("save_editor_settings", { settings });
}

export function openInEditor(
  repoPath: string,
  editorOverride?: PreferredEditor | null,
): Promise<void> {
  return invoke("open_in_editor", {
    repoPath,
    editorOverride: editorOverride ?? null,
  });
}

// ── PTY commands ────────────────────────────────────────────────────

export function spawnPty(
  command: string,
  cwd: string,
  env: Record<string, string>,
  cols: number,
  rows: number,
  onMessage: (msg: PtyOutput) => void,
): Promise<number> {
  const channel = new Channel<PtyOutput>();
  channel.onmessage = onMessage;
  return invoke("spawn_pty", {
    command,
    cwd,
    env,
    cols,
    rows,
    onData: channel,
  });
}

export function writePty(ptyId: number, data: string): Promise<void> {
  return invoke("write_pty", { ptyId, data });
}

export function resizePty(
  ptyId: number,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("resize_pty", { ptyId, cols, rows });
}

export function killPty(ptyId: number): Promise<void> {
  return invoke("kill_pty", { ptyId });
}

// ── Git commands ──────────────────────────────────────────────────

export function isGitRepo(path: string): Promise<boolean> {
  return invoke("is_git_repo", { path });
}

export function gitCurrentBranch(path: string): Promise<string> {
  return invoke("git_current_branch", { path });
}

export function gitListBranches(path: string): Promise<string[]> {
  return invoke("git_list_branches", { path });
}

export function gitCreateWorktree(
  repoPath: string,
  worktreePath: string,
  branchName: string,
): Promise<void> {
  return invoke("git_create_worktree", { repoPath, worktreePath, branchName });
}

export function gitRemoveWorktree(
  repoPath: string,
  worktreePath: string,
): Promise<void> {
  return invoke("git_remove_worktree", { repoPath, worktreePath });
}

export function gitListWorktrees(path: string): Promise<WorktreeEntry[]> {
  return invoke("git_list_worktrees", { path });
}

export function gitStatus(path: string): Promise<GitStatus> {
  return invoke("git_status", { path });
}

export function gitChangedFiles(path: string): Promise<ChangedFile[]> {
  return invoke("git_changed_files", { path });
}

export function gitFileDiff(path: string, filePath: string, staged: boolean): Promise<string> {
  return invoke("git_file_diff", { path, filePath, staged });
}

export function gitStageFile(path: string, filePath: string): Promise<void> {
  return invoke("git_stage_file", { path, filePath });
}

export function gitUnstageFile(path: string, filePath: string): Promise<void> {
  return invoke("git_unstage_file", { path, filePath });
}

export function gitSwitchBranch(path: string, branchName: string): Promise<void> {
  return invoke("git_switch_branch", { path, branchName });
}

export function gitCreateBranch(path: string, branchName: string): Promise<void> {
  return invoke("git_create_branch", { path, branchName });
}

// ── System commands ────────────────────────────────────────────────

export function getUsername(): Promise<string> {
  return invoke("get_username");
}

export function getComputerName(): Promise<string> {
  return invoke("get_computer_name");
}
