mod commands;
mod git;
mod pty;
mod workspace;

use tauri::Manager;

use pty::manager::PtyManager;
use workspace::manager::WorkspaceManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = fix_path_env::fix();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PtyManager::new())
        .manage(WorkspaceManager::new())
        .setup(|app| {
            // Run migration from old project-based config
            let workspace = app.state::<WorkspaceManager>();
            if let Err(e) = workspace.migrate() {
                eprintln!("Migration warning: {e}");
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_repos,
            commands::register_repo,
            commands::unregister_repo,
            commands::load_workspace,
            commands::save_workspace,
            commands::get_editor_settings,
            commands::save_editor_settings,
            commands::open_in_editor,
            commands::spawn_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::kill_pty,
            commands::get_username,
            commands::get_computer_name,
            commands::is_git_repo,
            commands::git_init,
            commands::git_current_branch,
            commands::git_list_branches,
            commands::git_create_worktree,
            commands::git_remove_worktree,
            commands::git_list_worktrees,
            commands::git_status,
            commands::git_changed_files,
            commands::git_file_diff,
            commands::git_stage_file,
            commands::git_unstage_file,
            commands::git_switch_branch,
            commands::git_create_branch,
            commands::check_command_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
