use std::fs;
use std::path::{Path, PathBuf};

use super::config::{
    CommandConfig, EditorSettings, GlobalConfig, RepoEntry, RepoInfo, WorkspaceConfig,
};

// ── Paths ───────────────────────────────────────────────────────────

fn shep_home() -> PathBuf {
    dirs::home_dir()
        .expect("Could not find home directory")
        .join(".shep")
}

fn global_config_path() -> PathBuf {
    shep_home().join("config.yml")
}

fn old_projects_dir() -> PathBuf {
    shep_home().join("projects")
}

fn repo_shep_dir(repo_path: &str) -> PathBuf {
    Path::new(repo_path).join(".shep")
}

fn repo_workspace_file(repo_path: &str) -> PathBuf {
    repo_shep_dir(repo_path).join("workspace.yml")
}

// ── Global config ───────────────────────────────────────────────────

pub fn load_global_config() -> Result<GlobalConfig, String> {
    let path = global_config_path();
    if !path.exists() {
        return Ok(GlobalConfig::default());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read global config: {e}"))?;
    serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse global config: {e}"))
}

pub fn save_global_config(config: &GlobalConfig) -> Result<(), String> {
    let dir = shep_home();
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create .shep dir: {e}"))?;

    let path = global_config_path();
    let yaml =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, yaml).map_err(|e| format!("Failed to write global config: {e}"))
}

pub fn load_editor_settings() -> Result<EditorSettings, String> {
    Ok(load_global_config()?.editor)
}

pub fn save_editor_settings(settings: &EditorSettings) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.editor = settings.clone();
    save_global_config(&config)
}

// ── Repo operations ─────────────────────────────────────────────────

pub fn list_repos() -> Result<Vec<RepoInfo>, String> {
    let config = load_global_config()?;
    let repos = config
        .repos
        .iter()
        .map(|entry| {
            let path = Path::new(&entry.path);
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            let valid = path.is_dir();
            RepoInfo {
                path: entry.path.clone(),
                name,
                valid,
            }
        })
        .collect();
    Ok(repos)
}

pub fn register_repo(repo_path: &str) -> Result<WorkspaceConfig, String> {
    let path = Path::new(repo_path);
    if !path.is_dir() {
        return Err(format!("Directory does not exist: {repo_path}"));
    }

    // Add to global config if not already there
    let mut config = load_global_config()?;
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path: {e}"))?;
    let canonical_str = canonical.to_string_lossy().to_string();

    if !config.repos.iter().any(|r| r.path == canonical_str) {
        config.repos.push(RepoEntry {
            path: canonical_str.clone(),
        });
        save_global_config(&config)?;
    }

    // Create .shep/ in repo if needed
    ensure_repo_shep_dir(&canonical_str)?;

    // Load or create workspace config
    load_or_create_workspace(&canonical_str)
}

pub fn unregister_repo(repo_path: &str) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.repos.retain(|r| r.path != repo_path);
    save_global_config(&config)
}

// ── Per-repo workspace ──────────────────────────────────────────────

pub fn load_repo_workspace(repo_path: &str) -> Result<WorkspaceConfig, String> {
    load_or_create_workspace(repo_path)
}

pub fn save_repo_workspace(repo_path: &str, config: &WorkspaceConfig) -> Result<(), String> {
    ensure_repo_shep_dir(repo_path)?;

    let path = repo_workspace_file(repo_path);
    let yaml =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, yaml).map_err(|e| format!("Failed to write workspace file: {e}"))
}

// ── Migration ───────────────────────────────────────────────────────

pub fn migrate_old_projects() -> Result<(), String> {
    let old_dir = old_projects_dir();
    if !old_dir.exists() {
        return Ok(());
    }

    // Check if we already have a global config (migration already done)
    let global_path = global_config_path();
    if global_path.exists() {
        return Ok(());
    }

    let mut global_config = GlobalConfig::default();

    let entries = fs::read_dir(&old_dir).map_err(|e| format!("Failed to read old projects: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let old_workspace_file = path.join("workspace.yml");
        if !old_workspace_file.exists() {
            continue;
        }

        let content = match fs::read_to_string(&old_workspace_file) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Parse old format (has cwd and tasks fields)
        let old_config: serde_yaml::Value = match serde_yaml::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let cwd = old_config
            .get("cwd")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if cwd.is_empty() || !Path::new(&cwd).is_dir() {
            continue;
        }

        let name = old_config
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // Convert tasks -> commands
        let commands: Vec<CommandConfig> = if let Some(tasks) = old_config.get("tasks") {
            if let Ok(task_configs) = serde_yaml::from_value::<Vec<CommandConfig>>(tasks.clone()) {
                task_configs
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        let workspace = WorkspaceConfig {
            name: if name.is_empty() {
                Path::new(&cwd)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string()
            } else {
                name
            },
            commands,
            assistants: Vec::new(),
        };

        // Write to repo's .shep/workspace.yml
        if ensure_repo_shep_dir(&cwd).is_ok() {
            let _ = save_repo_workspace(&cwd, &workspace);
        }

        // Add to global registry
        global_config.repos.push(RepoEntry { path: cwd });
    }

    if !global_config.repos.is_empty() {
        save_global_config(&global_config)?;
    }

    Ok(())
}

// ── Helpers ─────────────────────────────────────────────────────────

fn ensure_repo_shep_dir(repo_path: &str) -> Result<(), String> {
    let shep_dir = repo_shep_dir(repo_path);
    fs::create_dir_all(&shep_dir).map_err(|e| format!("Failed to create .shep dir: {e}"))?;

    // Create .gitignore in .shep/ to ignore everything
    let gitignore = shep_dir.join(".gitignore");
    if !gitignore.exists() {
        fs::write(&gitignore, "*\n").map_err(|e| format!("Failed to write .gitignore: {e}"))?;
    }

    Ok(())
}

fn load_or_create_workspace(repo_path: &str) -> Result<WorkspaceConfig, String> {
    let path = repo_workspace_file(repo_path);
    if path.exists() {
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read workspace file: {e}"))?;
        serde_yaml::from_str(&content)
            .map_err(|e| format!("Failed to parse workspace YAML: {e}"))
    } else {
        let name = Path::new(repo_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let config = WorkspaceConfig {
            name,
            commands: Vec::new(),
            assistants: Vec::new(),
        };

        save_repo_workspace(repo_path, &config)?;
        Ok(config)
    }
}
