pub mod db;
mod helpers;
pub mod ingest;
mod providers;
mod queries;
pub mod types;

pub use db::UsageDb;
pub use types::{LocalUsageDetails, ProviderUsageSnapshot};

use std::sync::Mutex;
use types::UsageWindowSnapshot;
use helpers::{now_epoch_seconds, now_iso_string};

/// Minimum seconds between provider API calls to avoid rate limiting.
const PROVIDER_API_COOLDOWN_SECS: u64 = 300; // 5 minutes

/// Cached provider API responses so we don't lose data on rate limit errors.
struct ProviderCache {
    claude: Option<(Vec<UsageWindowSnapshot>, Vec<UsageWindowSnapshot>)>,
    codex: Option<Vec<UsageWindowSnapshot>>,
    claude_fetched_at: u64,
    codex_fetched_at: u64,
}

static PROVIDER_CACHE: Mutex<ProviderCache> = Mutex::new(ProviderCache {
    claude: None,
    codex: None,
    claude_fetched_at: 0,
    codex_fetched_at: 0,
});

/// Fetch snapshots for all providers from whatever is currently in the DB.
/// Does NOT trigger ingestion — that runs in the background.
pub fn get_all_usage_snapshots(db: &UsageDb) -> Vec<ProviderUsageSnapshot> {
    // Refresh provider API data if cooldown has elapsed
    refresh_provider_cache();

    let conn = db.conn.lock().unwrap();
    vec![
        claude_snapshot(&conn),
        codex_snapshot(&conn),
        gemini_snapshot(&conn),
    ]
}

/// Fetch snapshot for a single provider.
pub fn get_usage_snapshot(db: &UsageDb, provider: &str) -> Result<ProviderUsageSnapshot, String> {
    refresh_provider_cache();

    let conn = db.conn.lock().unwrap();
    match provider {
        "codex" => Ok(codex_snapshot(&conn)),
        "claude" => Ok(claude_snapshot(&conn)),
        "gemini" => Ok(gemini_snapshot(&conn)),
        other => Err(format!("Unsupported usage provider: {other}")),
    }
}

/// Fetch local details for a provider scoped to a time window (5h, 7d, 30d).
pub fn get_windowed_details(db: &UsageDb, provider: &str, window: &str) -> Result<LocalUsageDetails, String> {
    let conn = db.conn.lock().unwrap();
    queries::windowed_details(&conn, provider, window)
        .ok_or_else(|| format!("No data for {provider}/{window}"))
}

/// Run background ingestion in a loop until fully caught up.
/// Yields between cycles so we don't monopolize the DB lock.
pub fn run_background_ingest(db: &UsageDb) {
    loop {
        let done = {
            let conn = db.conn.lock().unwrap();
            ingest::ingest_all(&conn)
        };
        if done {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
}

/// Refresh provider API cache if cooldown has elapsed.
fn refresh_provider_cache() {
    let now = now_epoch_seconds();
    let mut cache = PROVIDER_CACHE.lock().unwrap();

    if now - cache.claude_fetched_at >= PROVIDER_API_COOLDOWN_SECS {
        match providers::claude_provider_windows() {
            Ok(data) => {
                cache.claude = Some(data);
                cache.claude_fetched_at = now;
            }
            Err(e) => {
                eprintln!("Claude provider API error (using cache): {e}");
                cache.claude_fetched_at = now;
            }
        }
    }

    if now - cache.codex_fetched_at >= PROVIDER_API_COOLDOWN_SECS {
        match providers::codex_provider_windows() {
            Ok(data) => {
                cache.codex = Some(data);
                cache.codex_fetched_at = now;
            }
            Err(e) => {
                eprintln!("Codex provider API error (using cache): {e}");
                cache.codex_fetched_at = now;
            }
        }
    }
}

fn codex_snapshot(conn: &rusqlite::Connection) -> ProviderUsageSnapshot {
    let fetched_at = now_iso_string();
    let local = queries::local_details(conn, "codex");
    let cache = PROVIDER_CACHE.lock().unwrap();
    let cached_windows = cache.codex.clone();
    drop(cache);

    let mut summary_windows = Vec::new();
    let has_provider = cached_windows.is_some();

    if let Some(ref windows) = cached_windows {
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
        status: if has_provider { "ready".to_string() } else { "partial".to_string() },
        fetched_at,
        summary_windows,
        extra_windows: Vec::new(),
        local_details: local,
        error: None,
    }
}

fn claude_snapshot(conn: &rusqlite::Connection) -> ProviderUsageSnapshot {
    let fetched_at = now_iso_string();
    let local = queries::local_details(conn, "claude");
    let cache = PROVIDER_CACHE.lock().unwrap();
    let cached_data = cache.claude.clone();
    drop(cache);

    let mut summary_windows = Vec::new();
    let mut extra_windows = Vec::new();
    let has_provider = cached_data.is_some();

    if let Some((ref primary, ref extra)) = cached_data {
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
        status: if has_provider { "ready".to_string() } else { "partial".to_string() },
        fetched_at,
        summary_windows,
        extra_windows,
        local_details: local,
        error: None,
    }
}

fn gemini_snapshot(conn: &rusqlite::Connection) -> ProviderUsageSnapshot {
    let fetched_at = now_iso_string();
    let local = queries::local_details(conn, "gemini");
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
