use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use tauri::ipc::Channel;
use tauri::{Emitter, State};

use crate::git;
use crate::git::{ChangedFile, GitStatus, WorktreeEntry};
use crate::pty::manager::PtyManager;
use crate::pty::session::PtyOutput;
use crate::usage::{LocalUsageDetails, ProviderUsageSnapshot, UsageDb, UsageOverview};
use crate::watcher::GitWatcher;
use crate::workspace::config::{EditorSettings, KeybindingSettings, RegisteredRepo, RepoInfo, TerminalSettings, UsageSettings, WorkspaceConfig};
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
) -> Result<RegisteredRepo, String> {
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
pub fn get_keybinding_settings(
    workspace: State<'_, WorkspaceManager>,
) -> Result<KeybindingSettings, String> {
    workspace.load_keybinding_settings()
}

#[tauri::command]
pub fn save_keybinding_settings(
    settings: KeybindingSettings,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    workspace.save_keybinding_settings(&settings)
}

#[tauri::command]
pub fn get_terminal_settings(
    workspace: State<'_, WorkspaceManager>,
) -> Result<TerminalSettings, String> {
    workspace.load_terminal_settings()
}

#[tauri::command]
pub fn save_terminal_settings(
    settings: TerminalSettings,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    workspace.save_terminal_settings(&settings)
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

// ── App lifecycle commands ────────────────────────────────────────

#[tauri::command]
pub fn get_pty_session_count(pty_manager: State<'_, PtyManager>) -> usize {
    pty_manager.session_count()
}

#[tauri::command]
pub fn shutdown_and_quit(app: tauri::AppHandle, pty_manager: State<'_, PtyManager>, watcher: State<'_, GitWatcher>) {
    if !pty_manager.begin_shutdown() {
        return;
    }
    watcher.shutdown();
    pty_manager.kill_all();
    app.exit(0);
}

// ── File watcher commands ─────────────────────────────────────────

#[tauri::command]
pub fn watch_repo(path: &str, watcher: State<'_, GitWatcher>) -> Result<(), String> {
    watcher.watch(path)
}

#[tauri::command]
pub fn unwatch_repo(path: &str, watcher: State<'_, GitWatcher>) -> Result<(), String> {
    watcher.unwatch(path)
}

// ── Git commands (async — runs on Tauri thread pool, not main thread) ──

#[tauri::command]
pub async fn is_git_repo(path: String) -> bool {
    git::is_git_repo(&path)
}

#[tauri::command]
pub async fn git_init(path: String) -> Result<(), String> {
    git::init_repo(&path)
}

#[tauri::command]
pub async fn git_current_branch(path: String) -> Result<String, String> {
    git::current_branch(&path)
}

#[tauri::command]
pub async fn git_list_branches(path: String) -> Result<Vec<String>, String> {
    git::list_branches(&path)
}

#[tauri::command]
pub async fn git_create_worktree(
    repo_path: String,
    worktree_path: String,
    branch_name: String,
) -> Result<(), String> {
    git::create_worktree(&repo_path, &worktree_path, &branch_name)
}

#[tauri::command]
pub async fn git_remove_worktree(repo_path: String, worktree_path: String) -> Result<(), String> {
    git::remove_worktree(&repo_path, &worktree_path)
}

#[tauri::command]
pub async fn git_list_worktrees(path: String) -> Result<Vec<WorktreeEntry>, String> {
    git::list_worktrees(&path)
}

#[tauri::command]
pub async fn git_status(path: String) -> GitStatus {
    git::status(&path)
}

#[tauri::command]
pub async fn git_changed_files(path: String) -> Result<Vec<ChangedFile>, String> {
    git::changed_files(&path)
}

#[tauri::command]
pub async fn git_file_diff(path: String, file_path: String, staged: bool) -> Result<String, String> {
    git::file_diff(&path, &file_path, staged)
}

#[tauri::command]
pub async fn git_stage_file(path: String, file_path: String) -> Result<(), String> {
    git::stage_file(&path, &file_path)
}

#[tauri::command]
pub async fn git_unstage_file(path: String, file_path: String) -> Result<(), String> {
    git::unstage_file(&path, &file_path)
}

#[tauri::command]
pub async fn git_switch_branch(path: String, branch_name: String) -> Result<(), String> {
    git::switch_branch(&path, &branch_name)
}

#[tauri::command]
pub async fn git_create_branch(path: String, branch_name: String) -> Result<(), String> {
    git::create_branch(&path, &branch_name)
}

// ── System commands ────────────────────────────────────────────────

#[tauri::command]
pub fn get_username() -> String {
    std::env::var("USER").unwrap_or_default()
}

#[tauri::command]
pub fn get_default_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
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

#[tauri::command]
pub fn check_command_exists(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub async fn get_all_usage_snapshots(db: State<'_, UsageDb>) -> Result<Vec<ProviderUsageSnapshot>, String> {
    Ok(crate::usage::get_all_usage_snapshots(&db))
}

#[tauri::command]
pub async fn get_usage_snapshot(db: State<'_, UsageDb>, provider: String) -> Result<ProviderUsageSnapshot, String> {
    crate::usage::get_usage_snapshot(&db, &provider)
}

#[tauri::command]
pub fn get_usage_settings(
    workspace: State<'_, WorkspaceManager>,
) -> Result<UsageSettings, String> {
    workspace.load_usage_settings()
}

#[tauri::command]
pub fn save_usage_settings(
    settings: UsageSettings,
    workspace: State<'_, WorkspaceManager>,
) -> Result<(), String> {
    workspace.save_usage_settings(&settings)
}

#[tauri::command]
pub async fn get_usage_details(db: State<'_, UsageDb>, provider: String, window: String) -> Result<LocalUsageDetails, String> {
    crate::usage::get_windowed_details(&db, &provider, &window)
}

#[tauri::command]
pub async fn get_usage_overview(db: State<'_, UsageDb>, window: String) -> Result<UsageOverview, String> {
    crate::usage::get_usage_overview(&db, &window)
}

#[tauri::command]
pub fn refresh_usage_data(db: State<'_, UsageDb>, app: tauri::AppHandle) {
    let db = db.inner().clone();
    std::thread::spawn(move || {
        crate::usage::run_background_ingest(&db);
        let _ = app.emit("usage-ingest-complete", ());
    });
}

// ── Memory diagnostics (dev only) ──────────────────────────────────

#[derive(serde::Serialize)]
pub struct MemoryStats {
    /// Shep (Rust backend) resident memory in bytes
    pub app_rss: u64,
    /// Total resident memory of all child processes (CLI tools) in bytes
    pub children_rss: u64,
}

#[tauri::command]
pub async fn get_memory_stats(pty_manager: State<'_, PtyManager>) -> Result<MemoryStats, String> {
    let app_pid = std::process::id() as i32;
    let app_rss = rss_for_pid(app_pid);

    // Sum RSS of all child process trees
    let child_pids = pty_manager.child_pids();
    let mut children_rss: u64 = 0;
    for pid in child_pids {
        let pid = pid as i32;
        // The direct child + its descendants
        children_rss += rss_for_pid(pid);
        if let Ok(output) = Command::new("pgrep").arg("-P").arg(pid.to_string()).output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if let Ok(child) = line.trim().parse::<i32>() {
                    children_rss += rss_for_pid(child);
                }
            }
        }
    }

    Ok(MemoryStats { app_rss, children_rss })
}

/// Get resident set size (RSS) for a single PID using `ps`.
fn rss_for_pid(pid: i32) -> u64 {
    // ps -o rss= returns RSS in kilobytes
    Command::new("ps")
        .args(["-o", "rss=", "-p", &pid.to_string()])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.trim().parse::<u64>().ok())
        .map(|kb| kb * 1024)
        .unwrap_or(0)
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
