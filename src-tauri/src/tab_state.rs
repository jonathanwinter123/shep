use crate::usage::db::UsageDb;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedTab {
    pub id: String,
    pub position: i64,
    pub label: String,
    pub tab_type: String, // "shell" | "command" | "assistant"
    #[serde(default)]
    pub command_name: Option<String>,
    #[serde(default)]
    pub assistant_id: Option<String>,
    #[serde(default)]
    pub session_mode: Option<String>,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub is_active: bool,
}

pub fn load_tabs(db: &UsageDb, repo_path: &str) -> Result<Vec<PersistedTab>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock poisoned: {e}"))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, position, label, tab_type, command_name, assistant_id,
                    session_mode, session_id, is_active
             FROM tab_state WHERE repo_path = ?1 ORDER BY position ASC",
        )
        .map_err(|e| format!("Prepare load_tabs failed: {e}"))?;

    let rows = stmt
        .query_map(params![repo_path], |row| {
            Ok(PersistedTab {
                id: row.get(0)?,
                position: row.get(1)?,
                label: row.get(2)?,
                tab_type: row.get(3)?,
                command_name: row.get(4)?,
                assistant_id: row.get(5)?,
                session_mode: row.get(6)?,
                session_id: row.get(7)?,
                is_active: row.get::<_, i64>(8)? != 0,
            })
        })
        .map_err(|e| format!("Query load_tabs failed: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("Read row failed: {e}"))?);
    }
    Ok(out)
}

pub fn save_tabs(
    db: &UsageDb,
    repo_path: &str,
    tabs: &[PersistedTab],
) -> Result<(), String> {
    let mut conn = db.conn.lock().map_err(|e| format!("DB lock poisoned: {e}"))?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Begin tx failed: {e}"))?;

    tx.execute("DELETE FROM tab_state WHERE repo_path = ?1", params![repo_path])
        .map_err(|e| format!("Delete old tabs failed: {e}"))?;

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO tab_state
                   (id, repo_path, position, label, tab_type, command_name,
                    assistant_id, session_mode, session_id, is_active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            )
            .map_err(|e| format!("Prepare insert failed: {e}"))?;

        for tab in tabs {
            stmt.execute(params![
                tab.id,
                repo_path,
                tab.position,
                tab.label,
                tab.tab_type,
                tab.command_name,
                tab.assistant_id,
                tab.session_mode,
                tab.session_id,
                if tab.is_active { 1_i64 } else { 0_i64 },
            ])
            .map_err(|e| format!("Insert tab failed: {e}"))?;
        }
    }

    tx.commit().map_err(|e| format!("Commit failed: {e}"))?;
    Ok(())
}

pub fn clear_tabs(db: &UsageDb, repo_path: &str) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock poisoned: {e}"))?;
    conn.execute("DELETE FROM tab_state WHERE repo_path = ?1", params![repo_path])
        .map_err(|e| format!("Clear tabs failed: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_tab(id: &str, position: i64, is_active: bool) -> PersistedTab {
        PersistedTab {
            id: id.into(),
            position,
            label: format!("Tab {id}"),
            tab_type: "shell".into(),
            command_name: None,
            assistant_id: None,
            session_mode: None,
            session_id: None,
            is_active,
        }
    }

    #[test]
    fn save_and_load_roundtrip_preserves_order_and_fields() {
        let db = UsageDb::open_in_memory();
        let tabs = vec![
            sample_tab("tab-2", 0, false),
            sample_tab("tab-5", 1, true),
            sample_tab("tab-1", 2, false),
        ];
        save_tabs(&db, "/repo-a", &tabs).unwrap();

        let loaded = load_tabs(&db, "/repo-a").unwrap();
        assert_eq!(loaded.len(), 3);
        assert_eq!(loaded[0].id, "tab-2");
        assert_eq!(loaded[1].id, "tab-5");
        assert_eq!(loaded[2].id, "tab-1");
        assert!(loaded[1].is_active);
    }

    #[test]
    fn save_replaces_previous_snapshot_for_repo() {
        let db = UsageDb::open_in_memory();
        save_tabs(&db, "/r", &vec![sample_tab("a", 0, false), sample_tab("b", 1, false)]).unwrap();
        save_tabs(&db, "/r", &vec![sample_tab("c", 0, true)]).unwrap();

        let loaded = load_tabs(&db, "/r").unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].id, "c");
    }

    #[test]
    fn save_scoped_per_repo() {
        let db = UsageDb::open_in_memory();
        save_tabs(&db, "/a", &vec![sample_tab("t1", 0, false)]).unwrap();
        save_tabs(&db, "/b", &vec![sample_tab("t2", 0, false)]).unwrap();

        assert_eq!(load_tabs(&db, "/a").unwrap().len(), 1);
        assert_eq!(load_tabs(&db, "/b").unwrap().len(), 1);

        clear_tabs(&db, "/a").unwrap();
        assert_eq!(load_tabs(&db, "/a").unwrap().len(), 0);
        assert_eq!(load_tabs(&db, "/b").unwrap().len(), 1);
    }

    #[test]
    fn load_empty_repo_returns_empty_vec() {
        let db = UsageDb::open_in_memory();
        assert_eq!(load_tabs(&db, "/never-saved").unwrap().len(), 0);
    }
}
