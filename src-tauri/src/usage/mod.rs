use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageNamedTokens {
    pub name: String,
    pub tokens: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageTask {
    pub id: String,
    pub label: String,
    pub tokens: u64,
    pub model: Option<String>,
    pub project: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageProject {
    pub name: String,
    pub tokens: u64,
    pub sessions: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageWindowSnapshot {
    pub provider: String,
    pub window: String,
    pub label: String,
    pub source_type: String,
    pub confidence: String,
    pub used_percent: Option<f64>,
    pub remaining_percent: Option<f64>,
    pub reset_at: Option<String>,
    pub token_total: Option<u64>,
    pub pace_status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalUsageDetails {
    pub source_type: String,
    pub confidence: String,
    pub tokens_total: u64,
    pub tokens_input: Option<u64>,
    pub tokens_output: Option<u64>,
    pub tokens_cached: Option<u64>,
    pub tokens_thoughts: Option<u64>,
    pub tokens_5h: u64,
    pub tokens_7d: u64,
    pub tokens_30d: u64,
    pub top_models: Vec<UsageNamedTokens>,
    pub top_tasks: Vec<UsageTask>,
    pub top_projects: Vec<UsageProject>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderUsageSnapshot {
    pub provider: String,
    pub status: String,
    pub fetched_at: String,
    pub summary_windows: Vec<UsageWindowSnapshot>,
    pub extra_windows: Vec<UsageWindowSnapshot>,
    pub local_details: Option<LocalUsageDetails>,
    pub error: Option<String>,
}

pub fn get_all_usage_snapshots() -> Vec<ProviderUsageSnapshot> {
    vec![codex_snapshot(), claude_snapshot(), gemini_snapshot()]
}

pub fn get_usage_snapshot(provider: &str) -> Result<ProviderUsageSnapshot, String> {
    match provider {
        "codex" => Ok(codex_snapshot()),
        "claude" => Ok(claude_snapshot()),
        "gemini" => Ok(gemini_snapshot()),
        other => Err(format!("Unsupported usage provider: {other}")),
    }
}

fn codex_snapshot() -> ProviderUsageSnapshot {
    let fetched_at = now_iso_string();
    let local = codex_local_details();
    let provider_windows = codex_provider_windows();
    let mut summary_windows = Vec::new();
    let extra_windows = Vec::new();

    if let Ok(ref windows) = provider_windows {
        summary_windows.extend(windows.clone());
    }

    if let Some(ref details) = local {
        summary_windows.push(UsageWindowSnapshot {
            provider: "codex".to_string(),
            window: "30d".to_string(),
            label: "30d".to_string(),
            source_type: "local".to_string(),
            confidence: "observed".to_string(),
            used_percent: None,
            remaining_percent: None,
            reset_at: None,
            token_total: Some(details.tokens_30d),
            pace_status: None,
        });
    }

    ProviderUsageSnapshot {
        provider: "codex".to_string(),
        status: if provider_windows.is_ok() { "ready".to_string() } else { "partial".to_string() },
        fetched_at,
        summary_windows,
        extra_windows,
        local_details: local,
        error: provider_windows.err(),
    }
}

fn claude_snapshot() -> ProviderUsageSnapshot {
    let fetched_at = now_iso_string();
    let local = claude_local_details();
    let provider = claude_provider_windows();
    let mut summary_windows = Vec::new();
    let mut extra_windows = Vec::new();

    if let Ok((ref primary, ref extra)) = provider {
        summary_windows.extend(primary.clone());
        extra_windows.extend(extra.clone());
    }

    if let Some(ref details) = local {
        summary_windows.push(UsageWindowSnapshot {
            provider: "claude".to_string(),
            window: "30d".to_string(),
            label: "30d".to_string(),
            source_type: "local".to_string(),
            confidence: "observed".to_string(),
            used_percent: None,
            remaining_percent: None,
            reset_at: None,
            token_total: Some(details.tokens_30d),
            pace_status: None,
        });
    }

    ProviderUsageSnapshot {
        provider: "claude".to_string(),
        status: if provider.is_ok() { "ready".to_string() } else { "partial".to_string() },
        fetched_at,
        summary_windows,
        extra_windows,
        local_details: local,
        error: provider.err(),
    }
}

fn gemini_snapshot() -> ProviderUsageSnapshot {
    let fetched_at = now_iso_string();
    let local = gemini_local_details();
    let mut summary_windows = Vec::new();

    if let Some(ref details) = local {
        for (window, tokens) in [("5h", details.tokens_5h), ("7d", details.tokens_7d), ("30d", details.tokens_30d)] {
            summary_windows.push(UsageWindowSnapshot {
                provider: "gemini".to_string(),
                window: window.to_string(),
                label: window.to_string(),
                source_type: "local".to_string(),
                confidence: "observed".to_string(),
                used_percent: None,
                remaining_percent: None,
                reset_at: None,
                token_total: Some(tokens),
                pace_status: None,
            });
        }
    }

    ProviderUsageSnapshot {
        provider: "gemini".to_string(),
        status: if local.is_some() { "ready".to_string() } else { "unavailable".to_string() },
        fetched_at,
        summary_windows,
        extra_windows: Vec::new(),
        local_details: local,
        error: None,
    }
}

fn codex_provider_windows() -> Result<Vec<UsageWindowSnapshot>, String> {
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
        percent_window_from_json("codex", "5h", primary),
        percent_window_from_json("codex", "7d", secondary),
    ])
}

fn codex_local_details() -> Option<LocalUsageDetails> {
    let db = home_join(".codex/state_5.sqlite").ok()?;
    if !db.exists() {
        return None;
    }

    let window_json = sqlite_json(
        &db,
        "with now(ts) as (select cast(strftime('%s', 'now') as integer))
         select
           coalesce(sum(case when updated_at >= (select ts from now) - 18000 then tokens_used else 0 end), 0) as tokens_5h,
           coalesce(sum(case when updated_at >= (select ts from now) - 604800 then tokens_used else 0 end), 0) as tokens_7d,
           coalesce(sum(case when updated_at >= (select ts from now) - 2592000 then tokens_used else 0 end), 0) as tokens_30d,
           coalesce(sum(tokens_used), 0) as tokens_total
         from threads;",
    ).ok()?;
    let top_threads = sqlite_json(
        &db,
        "select id, title, tokens_used, coalesce(model, '') as model, cwd, updated_at
         from threads
         order by tokens_used desc
         limit 5;",
    ).ok()?;
    let model_totals = sqlite_json(
        &db,
        "select coalesce(model, 'unknown') as model, sum(tokens_used) as tokens_used
         from threads
         group by coalesce(model, 'unknown')
         order by sum(tokens_used) desc
         limit 10;",
    ).ok()?;

    let window_row = window_json.as_array().and_then(|rows| rows.first())?;
    let tokens_total = as_u64(window_row.get("tokens_total"));
    let tokens_5h = as_u64(window_row.get("tokens_5h"));
    let tokens_7d = as_u64(window_row.get("tokens_7d"));
    let tokens_30d = as_u64(window_row.get("tokens_30d"));

    let top_tasks = top_threads
        .as_array()
        .into_iter()
        .flatten()
        .map(|row| UsageTask {
            id: row.get("id").and_then(Value::as_str).unwrap_or_default().to_string(),
            label: row.get("title").and_then(Value::as_str).unwrap_or_default().to_string(),
            tokens: as_u64(row.get("tokens_used")),
            model: non_empty(row.get("model").and_then(Value::as_str)),
            project: row.get("cwd").and_then(Value::as_str).map(ToString::to_string),
            updated_at: row.get("updated_at").map(|v| v.to_string()),
        })
        .collect::<Vec<_>>();

    let top_models = model_totals
        .as_array()
        .into_iter()
        .flatten()
        .map(|row| UsageNamedTokens {
            name: row.get("model").and_then(Value::as_str).unwrap_or("unknown").to_string(),
            tokens: as_u64(row.get("tokens_used")),
        })
        .collect::<Vec<_>>();

    let top_projects = aggregate_projects(top_tasks.iter());

    Some(LocalUsageDetails {
        source_type: "local".to_string(),
        confidence: "observed".to_string(),
        tokens_total,
        tokens_input: None,
        tokens_output: None,
        tokens_cached: None,
        tokens_thoughts: None,
        tokens_5h,
        tokens_7d,
        tokens_30d,
        top_models,
        top_tasks,
        top_projects,
    })
}

fn claude_provider_windows() -> Result<(Vec<UsageWindowSnapshot>, Vec<UsageWindowSnapshot>), String> {
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

fn claude_local_details() -> Option<LocalUsageDetails> {
    let projects_dir = home_join(".claude/projects").ok()?;
    if !projects_dir.exists() {
        return None;
    }

    let mut total = 0u64;
    let mut total_5h = 0u64;
    let mut total_7d = 0u64;
    let mut total_30d = 0u64;
    let mut input_total = 0u64;
    let mut output_total = 0u64;
    let mut cached_total = 0u64;
    let mut model_totals: HashMap<String, u64> = HashMap::new();
    let mut project_totals: HashMap<String, u64> = HashMap::new();
    let mut task_totals: HashMap<String, UsageTask> = HashMap::new();
    let now = now_epoch_seconds() as i64;

    for path in walk_files(&projects_dir) {
        if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
            continue;
        }
        let project_name = path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
        let session_id = path.file_stem().and_then(|n| n.to_str()).unwrap_or_default().to_string();
        let mut session_tokens = 0u64;
        let mut session_updated_at: Option<String> = None;

        let contents = fs::read_to_string(&path).ok()?;
        for line in contents.lines() {
            let row: Value = match serde_json::from_str(line) {
                Ok(v) => v,
                Err(_) => continue,
            };
            let usage = match row.get("message").and_then(|m| m.get("usage")) {
                Some(v) if v.is_object() => v,
                _ => continue,
            };

            let input = as_u64(usage.get("input_tokens"));
            let output = as_u64(usage.get("output_tokens"));
            let cache_creation = as_u64(usage.get("cache_creation_input_tokens"));
            let cache_read = as_u64(usage.get("cache_read_input_tokens"));
            let token_sum = input + output + cache_creation + cache_read;
            let ts = row.get("timestamp").and_then(Value::as_str);
            let age = ts.and_then(iso_to_epoch_seconds).map(|epoch| now - epoch as i64);

            total += token_sum;
            input_total += input;
            output_total += output;
            cached_total += cache_creation + cache_read;
            session_tokens += token_sum;
            session_updated_at = ts.map(ToString::to_string);

            let model = row
                .get("message")
                .and_then(|m| m.get("model"))
                .and_then(Value::as_str)
                .unwrap_or("unknown")
                .to_string();
            *model_totals.entry(model).or_insert(0) += token_sum;
            *project_totals.entry(project_name.clone()).or_insert(0) += token_sum;

            if let Some(age_seconds) = age {
                if age_seconds <= 18_000 {
                    total_5h += token_sum;
                }
                if age_seconds <= 604_800 {
                    total_7d += token_sum;
                }
                if age_seconds <= 2_592_000 {
                    total_30d += token_sum;
                }
            }
        }

        if session_tokens > 0 {
            task_totals.insert(
                session_id.clone(),
                UsageTask {
                    id: session_id.clone(),
                    label: format!("{session_id}.jsonl"),
                    tokens: session_tokens,
                    model: None,
                    project: Some(path.to_string_lossy().to_string()),
                    updated_at: session_updated_at,
                },
            );
        }
    }

    let mut top_models = model_totals
        .into_iter()
        .map(|(name, tokens)| UsageNamedTokens { name, tokens })
        .collect::<Vec<_>>();
    top_models.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    top_models.truncate(5);

    let mut top_tasks = task_totals.into_values().collect::<Vec<_>>();
    top_tasks.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    top_tasks.truncate(5);

    let mut top_projects = project_totals
        .into_iter()
        .map(|(name, tokens)| UsageProject { name, tokens, sessions: None })
        .collect::<Vec<_>>();
    top_projects.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    top_projects.truncate(5);

    Some(LocalUsageDetails {
        source_type: "local".to_string(),
        confidence: "observed".to_string(),
        tokens_total: total,
        tokens_input: Some(input_total),
        tokens_output: Some(output_total),
        tokens_cached: Some(cached_total),
        tokens_thoughts: None,
        tokens_5h: total_5h,
        tokens_7d: total_7d,
        tokens_30d: total_30d,
        top_models,
        top_tasks,
        top_projects,
    })
}

fn gemini_local_details() -> Option<LocalUsageDetails> {
    let tmp_dir = home_join(".gemini/tmp").ok()?;
    if !tmp_dir.exists() {
        return None;
    }

    let now = now_epoch_seconds() as i64;
    let mut total = 0u64;
    let mut input = 0u64;
    let mut output = 0u64;
    let mut cached = 0u64;
    let mut thoughts = 0u64;
    let mut total_5h = 0u64;
    let mut total_7d = 0u64;
    let mut total_30d = 0u64;
    let mut model_totals: HashMap<String, u64> = HashMap::new();
    let mut project_totals: HashMap<String, (u64, u64)> = HashMap::new();
    let mut top_tasks = Vec::new();

    for path in walk_files(&tmp_dir) {
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        if path.parent().and_then(|p| p.file_name()).and_then(|n| n.to_str()) != Some("chats") {
            continue;
        }

        let json: Value = serde_json::from_str(&fs::read_to_string(&path).ok()?).ok()?;
        let project = path
            .parent()
            .and_then(Path::parent)
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let mut session_total = 0u64;
        let messages = json.get("messages").and_then(Value::as_array).cloned().unwrap_or_default();
        for message in messages {
            let tokens = match message.get("tokens") {
                Some(v) if v.is_object() => v,
                _ => continue,
            };
            let message_total = as_u64(tokens.get("total"));
            total += message_total;
            input += as_u64(tokens.get("input"));
            output += as_u64(tokens.get("output"));
            cached += as_u64(tokens.get("cached"));
            thoughts += as_u64(tokens.get("thoughts"));
            session_total += message_total;

            if let Some(model) = message.get("model").and_then(Value::as_str) {
                *model_totals.entry(model.to_string()).or_insert(0) += message_total;
            }
        }

        if session_total == 0 {
            continue;
        }

        let updated_at = json
            .get("lastUpdated")
            .and_then(Value::as_str)
            .or_else(|| json.get("startTime").and_then(Value::as_str));
        let age = updated_at.and_then(iso_to_epoch_seconds).map(|epoch| now - epoch as i64);

        if let Some(age_seconds) = age {
            if age_seconds <= 18_000 {
                total_5h += session_total;
                project_totals.entry(project.clone()).or_insert((0, 0)).0 += session_total;
            }
            if age_seconds <= 604_800 {
                total_7d += session_total;
                project_totals.entry(project.clone()).or_insert((0, 0)).0 += 0;
            }
            if age_seconds <= 2_592_000 {
                total_30d += session_total;
            }
        }

        let entry = project_totals.entry(project.clone()).or_insert((0, 0));
        entry.0 += 0;
        entry.1 += 1;

        top_tasks.push(UsageTask {
            id: json.get("sessionId").and_then(Value::as_str).unwrap_or_default().to_string(),
            label: path.to_string_lossy().to_string(),
            tokens: session_total,
            model: None,
            project: Some(project),
            updated_at: updated_at.map(ToString::to_string),
        });
    }

    top_tasks.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    top_tasks.truncate(5);

    let mut top_models = model_totals
        .into_iter()
        .map(|(name, tokens)| UsageNamedTokens { name, tokens })
        .collect::<Vec<_>>();
    top_models.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    top_models.truncate(5);

    let mut top_projects = project_totals
        .into_iter()
        .map(|(name, (tokens, sessions))| UsageProject { name, tokens, sessions: Some(sessions) })
        .collect::<Vec<_>>();
    top_projects.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    top_projects.truncate(5);

    Some(LocalUsageDetails {
        source_type: "local".to_string(),
        confidence: "observed".to_string(),
        tokens_total: total,
        tokens_input: Some(input),
        tokens_output: Some(output),
        tokens_cached: Some(cached),
        tokens_thoughts: Some(thoughts),
        tokens_5h: total_5h,
        tokens_7d: total_7d,
        tokens_30d: total_30d,
        top_models,
        top_tasks,
        top_projects,
    })
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

fn percent_window_from_json(provider: &str, label: &str, value: &Value) -> UsageWindowSnapshot {
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

fn aggregate_projects<'a>(tasks: impl Iterator<Item = &'a UsageTask>) -> Vec<UsageProject> {
    let mut map: HashMap<String, u64> = HashMap::new();
    for task in tasks {
        if let Some(project) = &task.project {
            *map.entry(project.clone()).or_insert(0) += task.tokens;
        }
    }
    let mut items = map
        .into_iter()
        .map(|(name, tokens)| UsageProject { name, tokens, sessions: None })
        .collect::<Vec<_>>();
    items.sort_by(|a, b| b.tokens.cmp(&a.tokens));
    items.truncate(5);
    items
}

fn sqlite_json(db_path: &Path, query: &str) -> Result<Value, String> {
    let db_str = db_path.to_string_lossy().to_string();
    let output = run_command("sqlite3", &["-json", &db_str, query])?;
    serde_json::from_str(&output).map_err(|e| format!("Failed to parse sqlite output: {e}"))
}

fn walk_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                } else {
                    files.push(path);
                }
            }
        }
    }
    files
}

fn run_command(program: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run {program}: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "{program} exited with status {:?}: {}",
            output.status.code(),
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    String::from_utf8(output.stdout)
        .map(|s| s.trim().to_string())
        .map_err(|e| format!("Invalid UTF-8 from {program}: {e}"))
}

fn home_join(suffix: &str) -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(suffix))
        .ok_or_else(|| "Unable to locate home directory".to_string())
}

fn now_epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn now_iso_string() -> String {
    let output = run_command("date", &["-u", "+%Y-%m-%dT%H:%M:%SZ"]);
    output.unwrap_or_else(|_| "unknown".to_string())
}

fn iso_to_epoch_seconds(value: &str) -> Option<u64> {
    let output = run_command("date", &["-j", "-f", "%Y-%m-%dT%H:%M:%S%z", &normalize_iso(value), "+%s"]).ok()?;
    output.parse::<u64>().ok()
}

fn normalize_iso(value: &str) -> String {
    if let Some(stripped) = value.strip_suffix('Z') {
        return format!("{stripped}+0000");
    }
    if value.len() >= 6 && value.as_bytes()[value.len() - 3] == b':' {
        let prefix = &value[..value.len() - 3];
        let suffix = &value[value.len() - 2..];
        return format!("{prefix}{suffix}");
    }
    value.to_string()
}

fn as_u64(value: Option<&Value>) -> u64 {
    match value {
        Some(Value::Number(n)) => n.as_u64().unwrap_or_default(),
        Some(Value::String(s)) => s.parse::<u64>().unwrap_or_default(),
        _ => 0,
    }
}

fn non_empty(value: Option<&str>) -> Option<String> {
    value.and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}
