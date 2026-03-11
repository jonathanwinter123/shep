use super::config::{EditorSettings, RepoInfo, WorkspaceConfig};
use super::loader;

pub struct WorkspaceManager;

impl WorkspaceManager {
    pub fn new() -> Self {
        WorkspaceManager
    }

    pub fn migrate(&self) -> Result<(), String> {
        loader::migrate_old_projects()
    }

    pub fn list_repos(&self) -> Result<Vec<RepoInfo>, String> {
        loader::list_repos()
    }

    pub fn register_repo(&self, repo_path: &str) -> Result<WorkspaceConfig, String> {
        loader::register_repo(repo_path)
    }

    pub fn unregister_repo(&self, repo_path: &str) -> Result<(), String> {
        loader::unregister_repo(repo_path)
    }

    pub fn load_workspace(&self, repo_path: &str) -> Result<WorkspaceConfig, String> {
        loader::load_repo_workspace(repo_path)
    }

    pub fn save_workspace(
        &self,
        repo_path: &str,
        config: &WorkspaceConfig,
    ) -> Result<(), String> {
        loader::save_repo_workspace(repo_path, config)
    }

    pub fn load_editor_settings(&self) -> Result<EditorSettings, String> {
        loader::load_editor_settings()
    }

    pub fn save_editor_settings(&self, settings: &EditorSettings) -> Result<(), String> {
        loader::save_editor_settings(settings)
    }
}
