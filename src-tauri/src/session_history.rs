use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub session_id: String,
    pub slug: String,
    pub first_prompt: String,
    pub started_at: String,
    pub message_count: u32,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionMessage {
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

fn claude_projects_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    Ok(PathBuf::from(home).join(".claude").join("projects"))
}

fn encode_repo_path(repo_path: &str) -> String {
    repo_path.replace('/', "-")
}

fn extract_text_content(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Array(blocks) => {
            let mut parts = Vec::new();
            for block in blocks {
                match block.get("type").and_then(|t| t.as_str()) {
                    Some("text") => {
                        if let Some(text) = block.get("text").and_then(|t| t.as_str()) {
                            parts.push(text.to_string());
                        }
                    }
                    Some("tool_use") => {
                        if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                            parts.push(format!("[Tool Use: {name}]"));
                        }
                    }
                    Some("tool_result") => {
                        // Skip tool results in display
                    }
                    Some("thinking") => {
                        // Skip thinking blocks in display
                    }
                    _ => {}
                }
            }
            parts.join("\n")
        }
        _ => String::new(),
    }
}

pub fn list_sessions(repo_path: &str) -> Result<Vec<SessionSummary>, String> {
    let projects_dir = claude_projects_dir()?;
    let encoded = encode_repo_path(repo_path);
    let session_dir = projects_dir.join(&encoded);

    if !session_dir.is_dir() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&session_dir)
        .map_err(|e| format!("Failed to read session directory: {e}"))?;

    let mut sessions = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
            continue;
        }

        let session_id = match path.file_stem().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut slug = String::new();
        let mut first_prompt = String::new();
        let mut started_at = String::new();
        let mut message_count: u32 = 0;

        for line in content.lines() {
            let obj: serde_json::Value = match serde_json::from_str(line) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let entry_type = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");

            // Pick up slug from any line that has it
            if slug.is_empty() {
                if let Some(s) = obj.get("slug").and_then(|s| s.as_str()) {
                    slug = s.to_string();
                }
            }

            match entry_type {
                "user" => {
                    let is_external = obj
                        .get("userType")
                        .and_then(|u| u.as_str())
                        .map(|u| u == "external")
                        .unwrap_or(false);

                    if is_external {
                        message_count += 1;

                        if first_prompt.is_empty() {
                            if let Some(ts) = obj.get("timestamp").and_then(|t| t.as_str()) {
                                started_at = ts.to_string();
                            }
                            if let Some(content_val) = obj.get("message").and_then(|m| m.get("content")) {
                                let text = extract_text_content(content_val);
                                first_prompt = if text.len() > 200 {
                                    let mut truncated = text[..200].to_string();
                                    truncated.push_str("…");
                                    truncated
                                } else {
                                    text
                                };
                            }
                        }
                    }
                }
                "assistant" => {
                    message_count += 1;
                }
                _ => {}
            }
        }

        // Skip sessions with no messages
        if message_count == 0 {
            continue;
        }

        // If no started_at from user message, try the first entry with a timestamp
        if started_at.is_empty() {
            for line in content.lines().take(5) {
                if let Ok(obj) = serde_json::from_str::<serde_json::Value>(line) {
                    if let Some(ts) = obj.get("timestamp").and_then(|t| t.as_str()) {
                        started_at = ts.to_string();
                        break;
                    }
                }
            }
        }

        sessions.push(SessionSummary {
            session_id,
            slug,
            first_prompt,
            started_at,
            message_count,
        });
    }

    // Sort by started_at descending (most recent first)
    sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    Ok(sessions)
}

pub fn read_session(repo_path: &str, session_id: &str) -> Result<Vec<SessionMessage>, String> {
    let projects_dir = claude_projects_dir()?;
    let encoded = encode_repo_path(repo_path);
    let file_path = projects_dir.join(&encoded).join(format!("{session_id}.jsonl"));

    if !file_path.is_file() {
        return Err(format!("Session file not found: {session_id}"));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read session file: {e}"))?;

    let mut messages = Vec::new();

    for line in content.lines() {
        let obj: serde_json::Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let entry_type = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");

        match entry_type {
            "user" => {
                let is_external = obj
                    .get("userType")
                    .and_then(|u| u.as_str())
                    .map(|u| u == "external")
                    .unwrap_or(false);

                if !is_external {
                    continue;
                }

                let timestamp = obj
                    .get("timestamp")
                    .and_then(|t| t.as_str())
                    .unwrap_or("")
                    .to_string();

                let content_text = obj
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .map(|c| extract_text_content(c))
                    .unwrap_or_default();

                messages.push(SessionMessage {
                    role: "user".to_string(),
                    content: content_text,
                    timestamp,
                });
            }
            "assistant" => {
                let timestamp = obj
                    .get("timestamp")
                    .and_then(|t| t.as_str())
                    .unwrap_or("")
                    .to_string();

                let content_text = obj
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .map(|c| extract_text_content(c))
                    .unwrap_or_default();

                // Skip entries with no visible content (e.g. pure thinking blocks)
                if content_text.is_empty() {
                    continue;
                }

                messages.push(SessionMessage {
                    role: "assistant".to_string(),
                    content: content_text,
                    timestamp,
                });
            }
            _ => {}
        }
    }

    Ok(messages)
}

pub fn search_sessions(repo_path: &str, query: &str) -> Result<Vec<String>, String> {
    let projects_dir = claude_projects_dir()?;
    let encoded = encode_repo_path(repo_path);
    let session_dir = projects_dir.join(&encoded);

    if !session_dir.is_dir() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&session_dir)
        .map_err(|e| format!("Failed to read session directory: {e}"))?;

    let query_lower = query.to_lowercase();
    let mut matching_ids = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
            continue;
        }

        let session_id = match path.file_stem().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut found = false;
        for line in content.lines() {
            if found {
                break;
            }

            let obj: serde_json::Value = match serde_json::from_str(line) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let entry_type = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");
            if entry_type != "user" && entry_type != "assistant" {
                continue;
            }

            if let Some(content_val) = obj.get("message").and_then(|m| m.get("content")) {
                let text = extract_text_content(content_val);
                if text.to_lowercase().contains(&query_lower) {
                    found = true;
                }
            }
        }

        if found {
            matching_ids.push(session_id);
        }
    }

    Ok(matching_ids)
}
