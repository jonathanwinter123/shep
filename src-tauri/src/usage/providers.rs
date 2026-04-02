use serde_json::Value;
use std::fs;

use super::helpers::{home_join, run_command};
use super::types::UsageWindowSnapshot;

/// Fetch Codex rate limit windows from ChatGPT API.
pub fn codex_provider_windows() -> Result<Vec<UsageWindowSnapshot>, String> {
    let auth_path = home_join(".codex/auth.json")?;
    let auth_text = fs::read_to_string(&auth_path)
        .map_err(|e| format!("Failed to read Codex auth file: {e}"))?;
    let auth_json: Value = serde_json::from_str(&auth_text)
        .map_err(|e| format!("Failed to parse Codex auth file: {e}"))?;
    let token = auth_json
        .get("tokens")
        .and_then(|v| v.get("access_token"))
        .and_then(Value::as_str)
        .or_else(|| auth_json.get("access_token").and_then(Value::as_str))
        .ok_or_else(|| "Missing Codex access token".to_string())?;

    let body = run_command(
        "curl",
        &[
            "-sS",
            "--max-time", "10",
            "-H",
            &format!("Authorization: Bearer {token}"),
            "https://chatgpt.com/backend-api/wham/usage",
        ],
    )?;
    let json: Value = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse Codex usage response: {e}"))?;

    let primary = json
        .get("rate_limit")
        .and_then(|v| v.get("primary_window"))
        .ok_or_else(|| "Codex usage response missing primary window".to_string())?;
    let secondary = json
        .get("rate_limit")
        .and_then(|v| v.get("secondary_window"))
        .ok_or_else(|| "Codex usage response missing secondary window".to_string())?;

    Ok(vec![
        percent_window("codex", "5h", primary),
        percent_window("codex", "7d", secondary),
    ])
}

/// Fetch Claude rate limit windows from Anthropic API.
pub fn claude_provider_windows() -> Result<(Vec<UsageWindowSnapshot>, Vec<UsageWindowSnapshot>), String> {
    let token_json = run_command("security", &["find-generic-password", "-s", "Claude Code-credentials", "-w"])?;
    let credentials: Value = serde_json::from_str(&token_json)
        .map_err(|e| format!("Failed to parse Claude Keychain credentials: {e}"))?;
    let token = credentials
        .get("claudeAiOauth")
        .and_then(|v| v.get("accessToken"))
        .and_then(Value::as_str)
        .ok_or_else(|| "Missing Claude OAuth access token".to_string())?;

    let body = run_command(
        "curl",
        &[
            "-sS",
            "--max-time", "10",
            "-H",
            &format!("Authorization: Bearer {token}"),
            "-H",
            "anthropic-beta: oauth-2025-04-20",
            "https://api.anthropic.com/api/oauth/usage",
        ],
    )?;
    let json: Value = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse Claude usage response: {e}"))?;

    let mut primary = Vec::new();
    let mut extra = Vec::new();

    if let Some(five_hour) = json.get("five_hour") {
        primary.push(claude_window("5h", five_hour));
    }
    if let Some(seven_day) = json.get("seven_day") {
        primary.push(claude_window("7d", seven_day));
    }
    if let Some(seven_day_sonnet) = json.get("seven_day_sonnet") {
        if !seven_day_sonnet.is_null() {
            extra.push(claude_window("7d_sonnet", seven_day_sonnet));
        }
    }

    if primary.is_empty() {
        Err("Claude usage response did not include expected windows".to_string())
    } else {
        Ok((primary, extra))
    }
}

fn claude_window(window: &str, value: &Value) -> UsageWindowSnapshot {
    let used = value.get("utilization").and_then(Value::as_f64);
    UsageWindowSnapshot {
        provider: "claude".to_string(),
        window: window.to_string(),
        label: window.replace('_', " "),
        source_type: "provider".to_string(),
        confidence: "official".to_string(),
        used_percent: used,
        remaining_percent: used.map(|v| (100.0 - v).max(0.0)),
        reset_at: value.get("resets_at").and_then(Value::as_str).map(ToString::to_string),
        token_total: None,
        pace_status: None,
    }
}

fn percent_window(provider: &str, label: &str, value: &Value) -> UsageWindowSnapshot {
    let used = value.get("used_percent").and_then(Value::as_f64);
    UsageWindowSnapshot {
        provider: provider.to_string(),
        window: label.to_string(),
        label: label.to_string(),
        source_type: "provider".to_string(),
        confidence: "official".to_string(),
        used_percent: used,
        remaining_percent: used.map(|v| (100.0 - v).max(0.0)),
        reset_at: value.get("reset_at").map(|v| v.to_string()),
        token_total: None,
        pace_status: None,
    }
}
