use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use tauri::ipc::Channel;
use tauri::State;

use crate::git;
use crate::git::{ChangedFile, GitStatus, WorktreeEntry};
use crate::pty::manager::PtyManager;
use crate::pty::session::PtyOutput;
use crate::workspace::config::{EditorSettings, RepoInfo, WorkspaceConfig};
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

#[tauri::command]
pub fn get_editor_settings(
    workspace: State<'_, WorkspaceManager>,
) -> Result<EditorSettings, String> {
    workspace.load_editor_settings()
}

#[tauri::command]
pub fn save_editor_settings(
    settings: EditorSettings,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    workspace.save_editor_settings(&settings)
}

#[tauri::command]
pub fn open_in_editor(
    repo_path: &str,
    editor_override: Option<String>,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    if !Path::new(repo_path).is_dir() {
        return Err(format!("Directory does not exist: {repo_path}"));
    }

    let editor_id = match editor_override {
        Some(editor_id) => editor_id,
        None => workspace
            .load_editor_settings()?
            .preferred_editor
            .ok_or_else(|| "Set a preferred editor in Settings before launching.".to_string())?,
    };

    open_path_in_editor(repo_path, &editor_id)
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
pub fn git_list_worktrees(path: &str) -> Result<Vec<WorktreeEntry>, String> {
    git::list_worktrees(path)
}

#[tauri::command]
pub fn git_status(path: &str) -> GitStatus {
    git::status(path)
}

#[tauri::command]
pub fn git_changed_files(path: &str) -> Result<Vec<ChangedFile>, String> {
    git::changed_files(path)
}

#[tauri::command]
pub fn git_file_diff(path: &str, file_path: &str, staged: bool) -> Result<String, String> {
    git::file_diff(path, file_path, staged)
}

#[tauri::command]
pub fn git_stage_file(path: &str, file_path: &str) -> Result<(), String> {
    git::stage_file(path, file_path)
}

#[tauri::command]
pub fn git_unstage_file(path: &str, file_path: &str) -> Result<(), String> {
    git::unstage_file(path, file_path)
}

#[tauri::command]
pub fn git_switch_branch(path: &str, branch_name: &str) -> Result<(), String> {
    git::switch_branch(path, branch_name)
}

#[tauri::command]
pub fn git_create_branch(path: &str, branch_name: &str) -> Result<(), String> {
    git::create_branch(path, branch_name)
}

// ── System commands ────────────────────────────────────────────────

#[tauri::command]
pub fn get_username() -> String {
    std::env::var("USER").unwrap_or_default()
}

#[tauri::command]
pub fn get_computer_name() -> String {
    Command::new("scutil")
        .args(["--get", "ComputerName"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

fn open_path_in_editor(repo_path: &str, editor_id: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let app_name = editor_app_name(editor_id)
            .ok_or_else(|| format!("Unsupported editor: {editor_id}"))?;

        let status = Command::new("open")
            .args(["-a", app_name, repo_path])
            .status()
            .map_err(|e| format!("Failed to launch {app_name}: {e}"))?;

        if status.success() {
            Ok(())
        } else {
            Err(format!(
                "Launching {app_name} failed with exit status {:?}",
                status.code()
            ))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = repo_path;
        let _ = editor_id;
        Err("Open in editor is currently only implemented for macOS.".to_string())
    }
}

fn editor_app_name(editor_id: &str) -> Option<&'static str> {
    match editor_id {
        "vscode" => Some("Visual Studio Code"),
        "zed" => Some("Zed"),
        "cursor" => Some("Cursor"),
        "sublime_text" => Some("Sublime Text"),
        _ => None,
    }
}
