pub mod db;
mod helpers;
pub mod ingest;
mod providers;
mod queries;
pub mod types;

pub use db::UsageDb;
pub use types::{LocalUsageDetails, ProviderUsageSnapshot, UsageOverview};

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
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
/// Provider API refresh happens in a background thread so this never blocks
/// on network I/O.
pub fn get_all_usage_snapshots(db: &UsageDb) -> Vec<ProviderUsageSnapshot> {
    // Kick off provider API refresh in the background (non-blocking)
    spawn_provider_refresh();

    let conn = db.conn.lock().unwrap();
    vec![
        claude_snapshot(&conn),
        codex_snapshot(&conn),
        gemini_snapshot(&conn),
    ]
}

/// Fetch snapshot for a single provider.
pub fn get_usage_snapshot(db: &UsageDb, provider: &str) -> Result<ProviderUsageSnapshot, String> {
    spawn_provider_refresh();

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

pub fn get_usage_overview(db: &UsageDb, window: &str) -> Result<UsageOverview, String> {
    let conn = db.conn.lock().unwrap();
    queries::usage_overview(&conn, window)
        .ok_or_else(|| format!("Unsupported usage overview window: {window}"))
}

/// Run background ingestion in a loop until fully caught up.
/// Processes a small batch per cycle and releases the DB lock between cycles
/// so UI queries (usage snapshots, etc.) aren't starved.
pub fn run_background_ingest(db: &UsageDb) {
    loop {
        let done = {
            let conn = db.conn.lock().unwrap();
            ingest::ingest_all(&conn)
        };
        if done {
            break;
        }
        // Yield for long enough that any queued UI query can grab the lock
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
}

/// Whether a provider refresh is already in flight (prevents piling up threads).
static PROVIDER_REFRESH_RUNNING: AtomicBool = AtomicBool::new(false);

/// Spawn a background thread to refresh provider API data if cooldown has
/// elapsed. Returns immediately — never blocks the calling thread on network I/O.
fn spawn_provider_refresh() {
    let now = now_epoch_seconds();
    {
        let cache = PROVIDER_CACHE.lock().unwrap();
        let claude_stale = now - cache.claude_fetched_at >= PROVIDER_API_COOLDOWN_SECS;
        let codex_stale = now - cache.codex_fetched_at >= PROVIDER_API_COOLDOWN_SECS;
        if !claude_stale && !codex_stale {
            return; // Cache is fresh, nothing to do
        }
    }

    // Only allow one refresh thread at a time
    if PROVIDER_REFRESH_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }

    std::thread::spawn(move || {
        refresh_provider_cache_sync();
        PROVIDER_REFRESH_RUNNING.store(false, Ordering::SeqCst);
    });
}

/// Actual (blocking) provider refresh — only called from background thread.
fn refresh_provider_cache_sync() {
    let now = now_epoch_seconds();

    // Check + fetch Claude
    {
        let needs_refresh = {
            let cache = PROVIDER_CACHE.lock().unwrap();
            now - cache.claude_fetched_at >= PROVIDER_API_COOLDOWN_SECS
        };
        if needs_refresh {
            match providers::claude_provider_windows() {
                Ok(data) => {
                    let mut cache = PROVIDER_CACHE.lock().unwrap();
                    cache.claude = Some(data);
                    cache.claude_fetched_at = now;
                }
                Err(e) => {
                    eprintln!("Claude provider API error (using cache): {e}");
                    let mut cache = PROVIDER_CACHE.lock().unwrap();
                    cache.claude_fetched_at = now;
                }
            }
        }
    }

    // Check + fetch Codex
    {
        let needs_refresh = {
            let cache = PROVIDER_CACHE.lock().unwrap();
            now - cache.codex_fetched_at >= PROVIDER_API_COOLDOWN_SECS
        };
        if needs_refresh {
            match providers::codex_provider_windows() {
                Ok(data) => {
                    let mut cache = PROVIDER_CACHE.lock().unwrap();
                    cache.codex = Some(data);
                    cache.codex_fetched_at = now;
                }
                Err(e) => {
                    eprintln!("Codex provider API error (using cache): {e}");
                    let mut cache = PROVIDER_CACHE.lock().unwrap();
                    cache.codex_fetched_at = now;
                }
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
