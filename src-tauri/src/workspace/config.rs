use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Global config (~/.shep/config.yml) ──────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalConfig {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub repos: Vec<RepoEntry>,
}

fn default_version() -> u32 {
    1
}

impl Default for GlobalConfig {
    fn default() -> Self {
        GlobalConfig {
            version: 1,
            repos: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoEntry {
    pub path: String,
}

// ── Repo info returned to frontend ──────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoInfo {
    pub path: String,
    pub name: String,
    pub valid: bool,
}

// ── Per-repo workspace config (<repo>/.shep/workspace.yml) ──────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandConfig {
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub autostart: bool,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub name: String,
    #[serde(default)]
    pub commands: Vec<CommandConfig>,
}
