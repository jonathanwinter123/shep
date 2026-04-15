use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct UsageDb {
    pub conn: Arc<Mutex<Connection>>,
}

impl UsageDb {
    /// Fallback: in-memory DB so the app still opens even if the disk DB fails.
    /// Usage data won't persist across restarts but nothing blocks.
    pub fn open_in_memory() -> Self {
        let conn = Connection::open_in_memory()
            .expect("Failed to open in-memory SQLite — this should never fail");
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;").ok();
        let _ = migrate(&conn);
        Self { conn: Arc::new(Mutex::new(conn)) }
    }

    pub fn open() -> Result<Self, String> {
        let db_path = db_path()?;
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create usage DB directory: {e}"))?;
        }
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open usage DB: {e}"))?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")
            .map_err(|e| format!("Failed to set DB pragmas: {e}"))?;

        migrate(&conn)?;

        Ok(Self { conn: Arc::new(Mutex::new(conn)) })
    }
}

fn db_path() -> Result<PathBuf, String> {
    dirs::home_dir()
        .map(|home| home.join(".shep").join("usage.sqlite3"))
        .ok_or_else(|| "Unable to locate home directory".to_string())
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);"
    ).map_err(|e| format!("Failed to create schema_version table: {e}"))?;

    let version: i64 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |r| r.get(0))
        .unwrap_or(0);

    if version < 1 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS usage_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                session_id TEXT NOT NULL,
                project TEXT,
                model TEXT,
                timestamp INTEGER NOT NULL,
                tokens_input INTEGER NOT NULL DEFAULT 0,
                tokens_output INTEGER NOT NULL DEFAULT 0,
                tokens_cache_write INTEGER NOT NULL DEFAULT 0,
                tokens_cache_read INTEGER NOT NULL DEFAULT 0,
                tokens_thoughts INTEGER NOT NULL DEFAULT 0,
                tokens_total INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_msg_provider_ts ON usage_messages(provider, timestamp);
            CREATE INDEX IF NOT EXISTS idx_msg_session ON usage_messages(provider, session_id);

            CREATE TABLE IF NOT EXISTS usage_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                date TEXT NOT NULL,
                model TEXT,
                project TEXT,
                tokens_input INTEGER NOT NULL DEFAULT 0,
                tokens_output INTEGER NOT NULL DEFAULT 0,
                tokens_cache_write INTEGER NOT NULL DEFAULT 0,
                tokens_cache_read INTEGER NOT NULL DEFAULT 0,
                tokens_thoughts INTEGER NOT NULL DEFAULT 0,
                tokens_total INTEGER NOT NULL DEFAULT 0,
                message_count INTEGER NOT NULL DEFAULT 0,
                UNIQUE(provider, date, model, project)
            );

            CREATE TABLE IF NOT EXISTS ingest_cursors (
                file_path TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                byte_offset INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            INSERT INTO schema_version (version) VALUES (1);"
        ).map_err(|e| format!("Failed to run migration v1: {e}"))?;
    }

    if version < 2 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS model_pricing (
                model_pattern TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                input_per_m REAL NOT NULL DEFAULT 0,
                output_per_m REAL NOT NULL DEFAULT 0,
                cache_read_per_m REAL NOT NULL DEFAULT 0,
                cache_write_per_m REAL NOT NULL DEFAULT 0,
                thoughts_per_m REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT '2026-03-20'
            );"
        ).map_err(|e| format!("Failed to create model_pricing table: {e}"))?;

        seed_pricing(conn)?;

        // Clear old codex data so it re-ingests from JSONL with full token breakdown
        conn.execute_batch(
            "DELETE FROM usage_messages WHERE provider = 'codex';
             DELETE FROM ingest_cursors WHERE provider = 'codex';
             INSERT INTO schema_version (version) VALUES (2);"
        ).map_err(|e| format!("Failed to run migration v2: {e}"))?;
    }

    if version < 3 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS tab_state (
                id TEXT NOT NULL,
                repo_path TEXT NOT NULL,
                position INTEGER NOT NULL,
                label TEXT NOT NULL,
                tab_type TEXT NOT NULL,
                command_name TEXT,
                assistant_id TEXT,
                session_mode TEXT,
                session_id TEXT,
                is_active INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (repo_path, id)
            );
            CREATE INDEX IF NOT EXISTS idx_tab_state_repo ON tab_state(repo_path, position);

            INSERT INTO schema_version (version) VALUES (3);"
        ).map_err(|e| format!("Failed to run migration v3: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migration_v3_creates_tab_state_table() {
        let db = UsageDb::open_in_memory();
        let conn = db.conn.lock().unwrap();

        // Table exists
        let table_exists: bool = conn
            .query_row(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tab_state'",
                [],
                |r| r.get::<_, i64>(0).map(|v| v == 1),
            )
            .unwrap_or(false);
        assert!(table_exists, "tab_state table should exist after migration");

        // Schema version is at least 3
        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0))
            .unwrap();
        assert!(version >= 3, "schema_version should be >= 3, got {}", version);

        // Can insert and read back a row with all columns
        conn.execute(
            "INSERT INTO tab_state (id, repo_path, position, label, tab_type, command_name, assistant_id, session_mode, session_id, is_active)
             VALUES ('tab-1', '/repo', 0, 'Terminal', 'shell', NULL, NULL, NULL, NULL, 1)",
            [],
        ).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tab_state WHERE repo_path = '/repo'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }
}

fn seed_pricing(conn: &Connection) -> Result<(), String> {
    let prices: &[(&str, &str, f64, f64, f64, f64, f64)] = &[
        // Claude models — per million tokens
        ("claude-opus-4-5",   "claude",  5.0,  25.0, 0.50, 6.25, 0.0),
        ("claude-opus-4-6",   "claude",  5.0,  25.0, 0.50, 6.25, 0.0),
        ("claude-sonnet-4-5", "claude",  3.0,  15.0, 0.30, 3.75, 0.0),
        ("claude-sonnet-4-6", "claude",  3.0,  15.0, 0.30, 3.75, 0.0),
        ("claude-haiku-4-5",  "claude",  1.0,   5.0, 0.10, 1.25, 0.0),

        // OpenAI / Codex models — per million tokens
        ("gpt-5.4",           "codex",   2.50, 10.0, 1.25, 0.0, 0.0),
        ("gpt-5.4-mini",      "codex",   0.40,  1.60, 0.20, 0.0, 0.0),
        ("gpt-5.4-nano",      "codex",   0.15,  0.60, 0.075, 0.0, 0.0),
        ("gpt-5.4-pro",       "codex",  10.0,  40.0, 5.0,  0.0, 0.0),
        ("gpt-5",             "codex",   1.25, 10.0, 0.125, 0.0, 0.0),
        ("gpt-5-mini",        "codex",   0.30,  1.25, 0.15, 0.0, 0.0),

        // Gemini models — per million tokens
        ("gemini-3-flash",    "gemini",  0.50,  3.0,  0.05, 1.0, 0.0),
        ("gemini-3.1-pro",    "gemini",  2.0,  12.0,  0.20, 0.0, 0.0),
        ("gemini-2.5-pro",    "gemini",  1.25, 10.0,  0.315, 0.0, 0.0),
        ("gemini-2.5-flash",  "gemini",  0.15,  0.60, 0.0375, 0.0, 0.0),
    ];

    for (pattern, provider, input, output, cache_read, cache_write, thoughts) in prices {
        conn.execute(
            "INSERT OR REPLACE INTO model_pricing (model_pattern, provider, input_per_m, output_per_m, cache_read_per_m, cache_write_per_m, thoughts_per_m)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![pattern, provider, input, output, cache_read, cache_write, thoughts],
        ).map_err(|e| format!("Failed to seed pricing: {e}"))?;
    }

    Ok(())
}
