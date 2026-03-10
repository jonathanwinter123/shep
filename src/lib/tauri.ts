import { invoke, Channel } from "@tauri-apps/api/core";
import type { RepoInfo, WorkspaceConfig, PtyOutput } from "./types";

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

// ── System commands ────────────────────────────────────────────────

export function getUsername(): Promise<string> {
  return invoke("get_username");
}

export function getComputerName(): Promise<string> {
  return invoke("get_computer_name");
}
