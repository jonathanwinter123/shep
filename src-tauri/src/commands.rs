use std::collections::HashMap;
use tauri::ipc::Channel;
use tauri::State;

use crate::git;
use crate::git::GitStatus;
use crate::pty::manager::PtyManager;
use crate::pty::session::PtyOutput;
use crate::workspace::config::{RepoInfo, WorkspaceConfig};
use crate::workspace::manager::WorkspaceManager;

// ── Workspace commands ──────────────────────────────────────────────

#[tauri::command]
pub fn list_repos(workspace: State<'_, WorkspaceManager>) -> Result<Vec<RepoInfo>, String> {
    workspace.list_repos()
}

#[tauri::command]
pub fn register_repo(
    repo_path: &str,
    workspace: State<'_, WorkspaceManager>,
) -> Result<WorkspaceConfig, String> {
    workspace.register_repo(repo_path)
}

#[tauri::command]
pub fn unregister_repo(
    repo_path: &str,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    workspace.unregister_repo(repo_path)
}

#[tauri::command]
pub fn load_workspace(
    repo_path: &str,
    workspace: State<'_, WorkspaceManager>,
) -> Result<WorkspaceConfig, String> {
    workspace.load_workspace(repo_path)
}

#[tauri::command]
pub fn save_workspace(
    repo_path: &str,
    config: WorkspaceConfig,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    workspace.save_workspace(repo_path, &config)
}

// ── PTY commands ────────────────────────────────────────────────────

#[tauri::command]
pub fn spawn_pty(
    command: &str,
    cwd: &str,
    env: HashMap<String, String>,
    cols: u16,
    rows: u16,
    on_data: Channel<PtyOutput>,
    pty_manager: State<'_, PtyManager>,
) -> Result<u32, String> {
    pty_manager.spawn(command, cwd, env, cols, rows, on_data)
}

#[tauri::command]
pub fn write_pty(
    pty_id: u32,
    data: &str,
    pty_manager: State<'_, PtyManager>,
) -> Result<(), String> {
    pty_manager.write(pty_id, data.as_bytes())
}

#[tauri::command]
pub fn resize_pty(
    pty_id: u32,
    cols: u16,
    rows: u16,
    pty_manager: State<'_, PtyManager>,
) -> Result<(), String> {
    pty_manager.resize(pty_id, cols, rows)
}

#[tauri::command]
pub fn kill_pty(pty_id: u32, pty_manager: State<'_, PtyManager>) -> Result<(), String> {
    pty_manager.kill(pty_id)
}

// ── Git commands ──────────────────────────────────────────────────

#[tauri::command]
pub fn is_git_repo(path: &str) -> bool {
    git::is_git_repo(path)
}

#[tauri::command]
pub fn git_current_branch(path: &str) -> Result<String, String> {
    git::current_branch(path)
}

#[tauri::command]
pub fn git_list_branches(path: &str) -> Result<Vec<String>, String> {
    git::list_branches(path)
}

#[tauri::command]
pub fn git_create_worktree(
    repo_path: &str,
    worktree_path: &str,
    branch_name: &str,
) -> Result<(), String> {
    git::create_worktree(repo_path, worktree_path, branch_name)
}

#[tauri::command]
pub fn git_remove_worktree(repo_path: &str, worktree_path: &str) -> Result<(), String> {
    git::remove_worktree(repo_path, worktree_path)
}

#[tauri::command]
pub fn git_status(path: &str) -> GitStatus {
    git::status(path)
}

// ── System commands ────────────────────────────────────────────────

#[tauri::command]
pub fn get_username() -> String {
    std::env::var("USER").unwrap_or_default()
}

#[tauri::command]
pub fn get_computer_name() -> String {
    std::process::Command::new("scutil")
        .args(["--get", "ComputerName"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}
