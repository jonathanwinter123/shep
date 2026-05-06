use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

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

pub fn claude_projects_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    Ok(PathBuf::from(home).join(".claude").join("projects"))
}

pub fn encode_repo_path(repo_path: &str) -> String {
    repo_path.replace('/', "-")
}

/// Resolve the Claude session directory for a given repo path
/// (e.g. ~/.claude/projects/-Users-jonathan-winter-shep).
pub fn project_dir_for(repo_path: &str) -> Result<PathBuf, String> {
    Ok(claude_projects_dir()?.join(encode_repo_path(repo_path)))
}

/// Search a directory of Claude `.jsonl` session files for the newest one whose
/// mtime is >= `since` and whose stem is NOT in `known_session_ids`.
///
/// Returns `Ok(None)` if the directory does not exist or no eligible file is
/// present. This is the core helper behind `find_new_claude_session` — kept
/// directory-based so it can be unit tested without HOME.
pub fn find_new_session_in_dir(
    session_dir: &Path,
    known_session_ids: &HashSet<String>,
    since: SystemTime,
) -> Result<Option<String>, String> {
    if !session_dir.is_dir() {
        return Ok(None);
    }

    let entries = fs::read_dir(session_dir)
        .map_err(|e| format!("Failed to read session directory: {e}"))?;

    let mut best: Option<(SystemTime, String)> = None;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
            continue;
        }

        let stem = match path.file_stem().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };

        if known_session_ids.contains(&stem) {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let modified = match metadata.modified() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if modified < since {
            continue;
        }

        match &best {
            Some((best_mtime, _)) if *best_mtime >= modified => {}
            _ => best = Some((modified, stem)),
        }
    }

    Ok(best.map(|(_, id)| id))
}

/// Find a forked session ID created after `since_unix_ms` for the given repo,
/// excluding any IDs already adopted by other tabs.
pub fn find_new_session(
    repo_path: &str,
    known_session_ids: Vec<String>,
    since_unix_ms: u64,
) -> Result<Option<String>, String> {
    let session_dir = project_dir_for(repo_path)?;
    let since = UNIX_EPOCH + Duration::from_millis(since_unix_ms);
    let known: HashSet<String> = known_session_ids.into_iter().collect();
    find_new_session_in_dir(&session_dir, &known, since)
}

/// Extract a user-friendly prompt from raw message text.
/// Detects command invocations (XML tags) and returns the command name + args
/// instead of the raw expanded content.
fn clean_prompt_text(raw: &str) -> Option<String> {
    let trimmed = raw.trim();

    // Skip local-command-caveat messages entirely — caller should try next message
    if trimmed.starts_with("<local-command-caveat>") {
        return None;
    }

    // Skip system_instruction messages
    if trimmed.starts_with("<system_instruction>") || trimmed.starts_with("<system-reminder>") {
        return None;
    }

    // Extract <command-name>/foo</command-name> with optional <command-args>bar</command-args>
    if let Some(cmd) = extract_xml_tag(trimmed, "command-name") {
        let args = extract_xml_tag(trimmed, "command-args").unwrap_or_default();
        if args.is_empty() {
            return Some(cmd.to_string());
        }
        return Some(format!("{cmd} {args}"));
    }

    // Extract <command-message>foo</command-message> as fallback
    if let Some(msg) = extract_xml_tag(trimmed, "command-message") {
        return Some(msg.to_string());
    }

    Some(trimmed.to_string())
}

fn extract_xml_tag<'a>(text: &'a str, tag: &str) -> Option<&'a str> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = text.find(&open)? + open.len();
    let end = text[start..].find(&close)? + start;
    let content = text[start..end].trim();
    if content.is_empty() {
        None
    } else {
        Some(content)
    }
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
                            if let Some(content_val) = obj.get("message").and_then(|m| m.get("content")) {
                                let raw_text = extract_text_content(content_val);
                                if let Some(cleaned) = clean_prompt_text(&raw_text) {
                                    // Found a usable first prompt
                                    if started_at.is_empty() {
                                        if let Some(ts) = obj.get("timestamp").and_then(|t| t.as_str()) {
                                            started_at = ts.to_string();
                                        }
                                    }
                                    first_prompt = if cleaned.len() > 200 {
                                        let mut truncated = cleaned[..200].to_string();
                                        truncated.push_str("…");
                                        truncated
                                    } else {
                                        cleaned
                                    };
                                } else {
                                    // Skippable message (caveat, system) — still record timestamp
                                    if started_at.is_empty() {
                                        if let Some(ts) = obj.get("timestamp").and_then(|t| t.as_str()) {
                                            started_at = ts.to_string();
                                        }
                                    }
                                }
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

#[cfg(test)]
mod find_new_session_tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    fn unique_temp_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let pid = std::process::id();
        let dir = std::env::temp_dir().join(format!("shep-find-new-session-{label}-{pid}-{nanos}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    fn write_session(dir: &Path, stem: &str, mtime: SystemTime) -> PathBuf {
        let path = dir.join(format!("{stem}.jsonl"));
        let mut f = File::create(&path).expect("create session file");
        writeln!(f, "{{}}").unwrap();
        f.sync_all().unwrap();
        set_mtime(&path, mtime);
        path
    }

    fn set_mtime(path: &Path, mtime: SystemTime) {
        // Use libc::utimensat to set the mtime portably on unix.
        use std::ffi::CString;
        let c = CString::new(path.as_os_str().to_string_lossy().as_bytes()).unwrap();
        let secs = mtime
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        let nsecs = mtime
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos() as i64;
        let times = [
            libc::timespec {
                tv_sec: secs as libc::time_t,
                tv_nsec: nsecs as libc::c_long,
            },
            libc::timespec {
                tv_sec: secs as libc::time_t,
                tv_nsec: nsecs as libc::c_long,
            },
        ];
        unsafe {
            libc::utimensat(libc::AT_FDCWD, c.as_ptr(), times.as_ptr(), 0);
        }
    }

    #[test]
    fn returns_none_when_dir_missing() {
        let missing = std::env::temp_dir().join("shep-does-not-exist-xyz");
        let result = find_new_session_in_dir(
            &missing,
            &HashSet::new(),
            UNIX_EPOCH,
        )
        .expect("ok");
        assert!(result.is_none());
    }

    #[test]
    fn picks_newest_unknown_session() {
        let dir = unique_temp_dir("picks-newest");
        let base = SystemTime::now() - Duration::from_secs(60);
        let spawn = base + Duration::from_secs(10);

        // Older than spawn — ignore.
        write_session(&dir, "old-session", base);
        // Eligible: after spawn, unknown.
        write_session(&dir, "fork-1", spawn + Duration::from_secs(5));
        // Newer eligible: should be returned.
        write_session(&dir, "fork-2", spawn + Duration::from_secs(20));
        // Known — must be excluded even though it's newest.
        write_session(&dir, "known", spawn + Duration::from_secs(30));
        // Non-jsonl file — ignore.
        let other = dir.join("notes.txt");
        File::create(&other).unwrap();
        set_mtime(&other, spawn + Duration::from_secs(40));

        let mut known = HashSet::new();
        known.insert("known".to_string());

        let got = find_new_session_in_dir(&dir, &known, spawn).expect("ok");
        assert_eq!(got, Some("fork-2".to_string()));

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn returns_none_when_only_known_or_old() {
        let dir = unique_temp_dir("none-eligible");
        let base = SystemTime::now() - Duration::from_secs(60);
        let spawn = base + Duration::from_secs(10);

        write_session(&dir, "old", base);
        write_session(&dir, "known", spawn + Duration::from_secs(5));

        let mut known = HashSet::new();
        known.insert("known".to_string());

        let got = find_new_session_in_dir(&dir, &known, spawn).expect("ok");
        assert!(got.is_none());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn encode_repo_path_matches_claude_format() {
        assert_eq!(
            encode_repo_path("/Users/jonathan-winter/shep"),
            "-Users-jonathan-winter-shep"
        );
    }
}
