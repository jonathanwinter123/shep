use std::collections::HashMap;
use std::sync::Mutex;

/// Maps an unguessable per-tab token to the Shep tab ID that owns it.
/// Created when a Claude tab is spawned, removed when the tab closes.
pub struct TokenRegistry {
    map: Mutex<HashMap<String, String>>,
}

impl TokenRegistry {
    pub fn new() -> Self {
        Self { map: Mutex::new(HashMap::new()) }
    }

    pub fn issue(&self, tab_id: &str) -> String {
        let token = uuid::Uuid::new_v4().simple().to_string();
        self.map.lock().unwrap().insert(token.clone(), tab_id.to_string());
        token
    }

    pub fn lookup(&self, token: &str) -> Option<String> {
        self.map.lock().unwrap().get(token).cloned()
    }

    pub fn revoke(&self, token: &str) {
        self.map.lock().unwrap().remove(token);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issue_lookup_revoke_roundtrip() {
        let r = TokenRegistry::new();
        let token = r.issue("tab-1");
        assert_eq!(r.lookup(&token).as_deref(), Some("tab-1"));
        r.revoke(&token);
        assert_eq!(r.lookup(&token), None);
    }

    #[test]
    fn unknown_token_returns_none() {
        let r = TokenRegistry::new();
        assert_eq!(r.lookup("nope"), None);
    }
}
