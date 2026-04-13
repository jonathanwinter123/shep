use serde::de::{MapAccess, Visitor};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

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
            usage: UsageSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EditorSettings {
    #[serde(default, rename = "preferredEditor")]
    pub preferred_editor: Option<String>,
}

/// Flat map of `actionId → keyCombo` keybindings.
///
/// Serializes as a plain YAML map (`terminal.newLine: "Shift+Enter"`).
/// Deserializes with backwards compatibility: old boolean keys
/// (`shiftEnterNewline: true`) are translated to the new dotted format.
#[derive(Debug, Clone, Serialize)]
pub struct KeybindingSettings(pub HashMap<String, String>);

impl Default for KeybindingSettings {
    fn default() -> Self {
        KeybindingSettings(HashMap::new())
    }
}

impl<'de> Deserialize<'de> for KeybindingSettings {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct KeybindingVisitor;

        impl<'de> Visitor<'de> for KeybindingVisitor {
            type Value = KeybindingSettings;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a map of keybinding settings")
            }

            fn visit_map<M>(self, mut map: M) -> Result<KeybindingSettings, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut result = HashMap::new();

                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        // Old format: boolean values for legacy keys
                        "shiftEnterNewline" | "shift_enter_newline" => {
                            let enabled: bool = map.next_value()?;
                            result.insert(
                                "terminal.newLine".to_string(),
                                if enabled { "Shift+Enter".to_string() } else { String::new() },
                            );
                        }
                        "optionDeleteWord" | "option_delete_word" => {
                            let enabled: bool = map.next_value()?;
                            result.insert(
                                "terminal.deleteWord".to_string(),
                                if enabled { "Option+Delete".to_string() } else { String::new() },
                            );
                        }
                        "cmdKClear" | "cmd_k_clear" => {
                            let enabled: bool = map.next_value()?;
                            result.insert(
                                "terminal.clearTerminal".to_string(),
                                if enabled { "Cmd+K".to_string() } else { String::new() },
                            );
                        }
                        // New format: string values with dotted keys
                        _ => {
                            let value: String = map.next_value()?;
                            result.insert(key, value);
                        }
                    }
                }

                Ok(KeybindingSettings(result))
            }
        }

        deserializer.deserialize_map(KeybindingVisitor)
    }
}

fn default_true() -> bool {
    true
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
    "'MesloLGS NF', 'Menlo', 'Monaco', 'Courier New', monospace".to_string()
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
pub struct UsageSettings {
    #[serde(default = "default_true", rename = "showClaude")]
    pub show_claude: bool,
    #[serde(default = "default_true", rename = "showCodex")]
    pub show_codex: bool,
    #[serde(default = "default_true", rename = "showGemini")]
    pub show_gemini: bool,
}

impl Default for UsageSettings {
    fn default() -> Self {
        UsageSettings {
            show_claude: true,
            show_codex: true,
            show_gemini: true,
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
