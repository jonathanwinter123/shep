use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use super::config::{
    CommandConfig, EditorSettings, GlobalConfig, ImportedFont, KeybindingSettings,
    RegisteredRepo, RepoEntry, RepoInfo, TerminalSettings, UsageSettings, WorkspaceConfig,
};

static CONFIG_CACHE: Mutex<Option<(GlobalConfig, SystemTime)>> = Mutex::new(None);

// ── Paths ───────────────────────────────────────────────────────────

fn shep_home() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?
        .join(".shep"))
}

fn global_config_path() -> Result<PathBuf, String> {
    Ok(shep_home()?.join("config.yml"))
}

fn imported_fonts_dir() -> Result<PathBuf, String> {
    Ok(shep_home()?.join("fonts"))
}

fn old_projects_dir() -> Result<PathBuf, String> {
    Ok(shep_home()?.join("projects"))
}

fn repo_shep_dir(repo_path: &str) -> PathBuf {
    Path::new(repo_path).join(".shep")
}

fn repo_workspace_file(repo_path: &str) -> PathBuf {
    repo_shep_dir(repo_path).join("workspace.yml")
}

// ── Global config ───────────────────────────────────────────────────

pub fn load_global_config() -> Result<GlobalConfig, String> {
    let path = global_config_path()?;
    if !path.exists() {
        return Ok(GlobalConfig::default());
    }

    let mtime = fs::metadata(&path)
        .and_then(|m| m.modified())
        .unwrap_or(UNIX_EPOCH);

    if let Ok(guard) = CONFIG_CACHE.lock() {
        if let Some((ref cached, ref cached_mtime)) = *guard {
            if *cached_mtime == mtime {
                return Ok(cached.clone());
            }
        }
    }

    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read global config: {e}"))?;
    let config: GlobalConfig =
        serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse global config: {e}"))?;

    if let Ok(mut guard) = CONFIG_CACHE.lock() {
        *guard = Some((config.clone(), mtime));
    }

    Ok(config)
}

pub fn save_global_config(config: &GlobalConfig) -> Result<(), String> {
    let dir = shep_home()?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create .shep dir: {e}"))?;

    let path = global_config_path()?;
    let yaml =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, &yaml).map_err(|e| format!("Failed to write global config: {e}"))?;

    // Update cache with the config we just wrote
    if let Ok(mtime) = fs::metadata(&path).and_then(|m| m.modified()) {
        if let Ok(mut guard) = CONFIG_CACHE.lock() {
            *guard = Some((config.clone(), mtime));
        }
    }

    Ok(())
}

pub fn load_editor_settings() -> Result<EditorSettings, String> {
    Ok(load_global_config()?.editor)
}

pub fn save_editor_settings(settings: &EditorSettings) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.editor = settings.clone();
    save_global_config(&config)
}

pub fn load_keybinding_settings() -> Result<KeybindingSettings, String> {
    Ok(load_global_config()?.keybindings)
}

pub fn save_keybinding_settings(settings: &KeybindingSettings) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.keybindings = settings.clone();
    save_global_config(&config)
}

pub fn load_terminal_settings() -> Result<TerminalSettings, String> {
    Ok(load_global_config()?.terminal)
}

pub fn save_terminal_settings(settings: &TerminalSettings) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.terminal = settings.clone();
    save_global_config(&config)
}

pub fn list_imported_fonts() -> Result<Vec<ImportedFont>, String> {
    Ok(load_global_config()?.fonts)
}

pub fn import_font(source_path: &str) -> Result<ImportedFont, String> {
    let source = Path::new(source_path);
    if !source.is_file() {
        return Err(format!("Font file does not exist: {source_path}"));
    }

    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| "Font file must have a .ttf, .otf, .woff, or .woff2 extension".to_string())?;

    if !matches!(extension.as_str(), "ttf" | "otf" | "woff" | "woff2") {
        return Err("Only .ttf, .otf, .woff, and .woff2 font files are supported".to_string());
    }

    let label = source
        .file_stem()
        .and_then(|stem| stem.to_str())
        .map(|stem| stem.trim().to_string())
        .filter(|stem| !stem.is_empty())
        .ok_or_else(|| "Could not determine a font name from the selected file".to_string())?;

    let id = format!(
        "font-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("System clock error: {e}"))?
            .as_millis()
    );
    let file_name = format!("{id}.{extension}");
    let family = format!("Shep User Font {id}");
    let format = match extension.as_str() {
        "ttf" => "truetype",
        "otf" => "opentype",
        "woff" => "woff",
        "woff2" => "woff2",
        _ => unreachable!(),
    }
    .to_string();

    let fonts_dir = imported_fonts_dir()?;
    fs::create_dir_all(&fonts_dir).map_err(|e| format!("Failed to create fonts directory: {e}"))?;

    let destination = fonts_dir.join(&file_name);
    fs::copy(source, &destination).map_err(|e| format!("Failed to copy font file: {e}"))?;

    let imported_font = ImportedFont {
        id,
        label,
        family,
        file_name,
        format,
    };

    let mut config = load_global_config()?;
    config.fonts.push(imported_font.clone());
    save_global_config(&config)?;

    Ok(imported_font)
}

pub fn read_imported_font(font_id: &str) -> Result<Vec<u8>, String> {
    let config = load_global_config()?;
    let font = config
        .fonts
        .iter()
        .find(|font| font.id == font_id)
        .ok_or_else(|| format!("Unknown imported font: {font_id}"))?;

    let path = imported_fonts_dir()?.join(&font.file_name);
    fs::read(&path).map_err(|e| format!("Failed to read imported font: {e}"))
}

pub fn load_usage_settings() -> Result<UsageSettings, String> {
    Ok(load_global_config()?.usage)
}

pub fn save_usage_settings(settings: &UsageSettings) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.usage = settings.clone();
    save_global_config(&config)
}

// ── Repo operations ─────────────────────────────────────────────────

pub fn list_repos() -> Result<Vec<RepoInfo>, String> {
    let config = load_global_config()?;

    let repos = config.repos
        .iter()
        .map(|entry| {
            let path = Path::new(&entry.path);
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            RepoInfo {
                path: entry.path.clone(),
                name,
            }
        })
        .collect();
    Ok(repos)
}

pub fn register_repo(repo_path: &str) -> Result<RegisteredRepo, String> {
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

    // Load existing workspace config or return an in-memory default. We create
    // `.shep` lazily only when the user actually saves project config.
    let workspace = load_or_default_workspace(&canonical_str)?;
    Ok(RegisteredRepo {
        path: canonical_str,
        workspace,
    })
}

pub fn unregister_repo(repo_path: &str) -> Result<(), String> {
    let mut config = load_global_config()?;
    config.repos.retain(|r| r.path != repo_path);
    save_global_config(&config)
}

// ── Per-repo workspace ──────────────────────────────────────────────

pub fn load_repo_workspace(repo_path: &str) -> Result<WorkspaceConfig, String> {
    load_or_default_workspace(repo_path)
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
    let old_dir = old_projects_dir()?;
    if !old_dir.exists() {
        return Ok(());
    }

    // Check if we already have a global config (migration already done)
    let global_path = global_config_path()?;
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
            serde_yaml::from_value::<Vec<CommandConfig>>(tasks.clone()).unwrap_or_default()
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

fn load_or_default_workspace(repo_path: &str) -> Result<WorkspaceConfig, String> {
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

        Ok(config)
    }
}
