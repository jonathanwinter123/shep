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
    #[serde(default)]
    pub fonts: Vec<ImportedFont>,
    #[serde(default)]
    pub usage: UsageSettings,
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
            fonts: Vec::new(),
            usage: UsageSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedFont {
    pub id: String,
    pub label: String,
    pub family: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    pub format: String,
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
    #[serde(default = "default_font_family", rename = "fontFamily")]
    pub font_family: String,
    #[serde(default = "default_font_size", rename = "fontSize")]
    pub font_size: u32,
}

fn default_cursor_style() -> String {
    "block".to_string()
}

fn default_scrollback() -> u32 {
    10000
}

fn default_font_family() -> String {
    "MesloLGS NF".to_string()
}

fn default_font_size() -> u32 {
    14
}

impl Default for TerminalSettings {
    fn default() -> Self {
        TerminalSettings {
            cursor_style: default_cursor_style(),
            cursor_blink: true,
            scrollback: default_scrollback(),
            font_family: default_font_family(),
            font_size: default_font_size(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderBudgetConfig {
    #[serde(default = "default_true")]
    pub show: bool,
    #[serde(default = "default_budget_mode_subscription", rename = "budgetMode")]
    pub budget_mode: String,
    #[serde(default, rename = "monthlyBudget")]
    pub monthly_budget: Option<f64>,
}

fn default_budget_mode_subscription() -> String {
    "subscription".to_string()
}

impl ProviderBudgetConfig {
    fn default_subscription() -> Self {
        ProviderBudgetConfig {
            show: true,
            budget_mode: "subscription".to_string(),
            monthly_budget: None,
        }
    }

    fn default_custom() -> Self {
        ProviderBudgetConfig {
            show: true,
            budget_mode: "custom".to_string(),
            monthly_budget: None,
        }
    }
}

fn default_provider_subscription() -> ProviderBudgetConfig {
    ProviderBudgetConfig::default_subscription()
}

fn default_provider_custom() -> ProviderBudgetConfig {
    ProviderBudgetConfig::default_custom()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSettings {
    #[serde(default = "default_provider_subscription")]
    pub claude: ProviderBudgetConfig,
    #[serde(default = "default_provider_subscription")]
    pub codex: ProviderBudgetConfig,
    #[serde(default = "default_provider_subscription")]
    pub gemini: ProviderBudgetConfig,
    #[serde(default = "default_provider_custom")]
    pub opencode: ProviderBudgetConfig,
}

impl Default for UsageSettings {
    fn default() -> Self {
        UsageSettings {
            claude: ProviderBudgetConfig::default_subscription(),
            codex: ProviderBudgetConfig::default_subscription(),
            gemini: ProviderBudgetConfig { show: false, ..ProviderBudgetConfig::default_subscription() },
            opencode: ProviderBudgetConfig {
                monthly_budget: Some(100.0),
                ..ProviderBudgetConfig::default_custom()
            },
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
