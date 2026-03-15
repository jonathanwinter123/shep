use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Global config (~/.shep/config.yml) ──────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalConfig {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub repos: Vec<RepoEntry>,
    #[serde(default)]
    pub editor: EditorSettings,
    #[serde(default)]
    pub keybindings: KeybindingSettings,
    #[serde(default)]
    pub terminal: TerminalSettings,
}

fn default_version() -> u32 {
    1
}

impl Default for GlobalConfig {
    fn default() -> Self {
        GlobalConfig {
            version: 1,
            repos: Vec::new(),
            editor: EditorSettings::default(),
            keybindings: KeybindingSettings::default(),
            terminal: TerminalSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EditorSettings {
    #[serde(default, rename = "preferredEditor")]
    pub preferred_editor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeybindingSettings {
    #[serde(default = "default_true", rename = "shiftEnterNewline")]
    pub shift_enter_newline: bool,
    #[serde(default = "default_true", rename = "optionDeleteWord")]
    pub option_delete_word: bool,
    #[serde(default = "default_true", rename = "cmdKClear")]
    pub cmd_k_clear: bool,
}

fn default_true() -> bool {
    true
}

impl Default for KeybindingSettings {
    fn default() -> Self {
        KeybindingSettings {
            shift_enter_newline: true,
            option_delete_word: true,
            cmd_k_clear: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSettings {
    #[serde(default = "default_cursor_style", rename = "cursorStyle")]
    pub cursor_style: String,
    #[serde(default = "default_true", rename = "cursorBlink")]
    pub cursor_blink: bool,
    #[serde(default = "default_scrollback")]
    pub scrollback: u32,
}

fn default_cursor_style() -> String {
    "block".to_string()
}

fn default_scrollback() -> u32 {
    10000
}

impl Default for TerminalSettings {
    fn default() -> Self {
        TerminalSettings {
            cursor_style: default_cursor_style(),
            cursor_blink: true,
            scrollback: default_scrollback(),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisteredRepo {
    pub path: String,
    pub workspace: WorkspaceConfig,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssistantConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    pub yolo_flag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub name: String,
    #[serde(default)]
    pub commands: Vec<CommandConfig>,
    #[serde(default)]
    pub assistants: Vec<AssistantConfig>,
}
