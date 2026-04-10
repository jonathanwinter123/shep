use rusqlite::Connection;
use serde::Deserialize;
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
        seed_pricing(&conn)?;

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

    let needs_v3 =
        version < 3
        || !column_exists(conn, "usage_messages", "pricing_provider")
        || !column_exists(conn, "usage_messages", "recorded_cost")
        || !column_exists(conn, "usage_daily", "pricing_provider")
        || !column_exists(conn, "usage_daily", "recorded_cost");

    if needs_v3 {
        ensure_column(conn, "usage_messages", "pricing_provider", "TEXT")?;
        ensure_column(conn, "usage_messages", "recorded_cost", "REAL")?;
        ensure_column(conn, "usage_daily", "pricing_provider", "TEXT")?;
        ensure_column(conn, "usage_daily", "recorded_cost", "REAL")?;

        conn.execute_batch(
            "UPDATE usage_messages
             SET pricing_provider = provider
             WHERE pricing_provider IS NULL OR pricing_provider = '';
             UPDATE usage_daily
             SET pricing_provider = provider
             WHERE pricing_provider IS NULL OR pricing_provider = '';
             INSERT INTO schema_version (version)
             SELECT 3
             WHERE COALESCE((SELECT MAX(version) FROM schema_version), 0) < 3;"
        ).map_err(|e| format!("Failed to run migration v3 data backfill: {e}"))?;
    }

    Ok(())
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> bool {
    let pragma = format!("PRAGMA table_info({table})");
    let mut stmt = match conn.prepare(&pragma) {
        Ok(stmt) => stmt,
        Err(_) => return false,
    };

    let rows = match stmt.query_map([], |row| row.get::<_, String>(1)) {
        Ok(rows) => rows,
        Err(_) => return false,
    };

    let exists = rows.filter_map(|row| row.ok()).any(|name| name == column);
    exists
}

fn ensure_column(conn: &Connection, table: &str, column: &str, definition: &str) -> Result<(), String> {
    if column_exists(conn, table, column) {
        return Ok(());
    }

    let sql = format!("ALTER TABLE {table} ADD COLUMN {column} {definition}");
    conn.execute(&sql, [])
        .map_err(|e| format!("Failed adding column {table}.{column}: {e}"))?;
    Ok(())
}

fn seed_pricing(conn: &Connection) -> Result<(), String> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct PricingSeedRow {
        provider: String,
        model_pattern: String,
        input_per_m: f64,
        output_per_m: f64,
        cache_read_per_m: f64,
        cache_write_per_m: f64,
        thoughts_per_m: f64,
    }

    let rows: Vec<PricingSeedRow> = serde_json::from_str(include_str!("model_pricing_snapshot.json"))
        .map_err(|e| format!("Failed to parse bundled pricing snapshot: {e}"))?;

    conn.execute("DELETE FROM model_pricing", [])
        .map_err(|e| format!("Failed to clear pricing snapshot: {e}"))?;

    for row in rows {
        conn.execute(
            "INSERT OR REPLACE INTO model_pricing (model_pattern, provider, input_per_m, output_per_m, cache_read_per_m, cache_write_per_m, thoughts_per_m)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                row.model_pattern,
                row.provider,
                row.input_per_m,
                row.output_per_m,
                row.cache_read_per_m,
                row.cache_write_per_m,
                row.thoughts_per_m
            ],
        ).map_err(|e| format!("Failed to seed pricing: {e}"))?;
    }

    Ok(())
}
