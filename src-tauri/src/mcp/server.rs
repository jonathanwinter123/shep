use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::{Path, State},
    routing::post,
    Json, Router,
};
use serde_json::{json, Value};
use tauri::AppHandle;
use tauri::Emitter;
use tokio::net::TcpListener;
use tokio::sync::OnceCell;

use super::registry::TokenRegistry;

#[derive(Clone)]
pub struct McpState {
    pub registry: Arc<TokenRegistry>,
    pub app: AppHandle,
}

static SERVER_PORT: OnceCell<u16> = OnceCell::const_new();

pub fn server_port() -> Option<u16> {
    SERVER_PORT.get().copied()
}

pub async fn start(app: AppHandle, registry: Arc<TokenRegistry>) -> std::io::Result<u16> {
    let state = McpState { registry, app };

    let router = Router::new()
        .route("/mcp/:token", post(handle_mcp))
        .with_state(state);

    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))).await?;
    let port = listener.local_addr()?.port();
    SERVER_PORT.set(port).ok();

    tokio::spawn(async move {
        let _ = axum::serve(listener, router).await;
    });

    Ok(port)
}

async fn handle_mcp(
    State(state): State<McpState>,
    Path(token): Path<String>,
    Json(req): Json<Value>,
) -> Json<Value> {
    let id = req.get("id").cloned();
    let tab_id = match state.registry.lookup(&token) {
        Some(tid) => tid,
        None => return Json(error(id, -32001, "Unknown tab token")),
    };

    let method = req.get("method").and_then(|m| m.as_str()).unwrap_or("");

    match method {
        "initialize" => Json(success(id, json!({
            "protocolVersion": "2024-11-05",
            "capabilities": { "tools": {} },
            "serverInfo": { "name": "shep", "version": env!("CARGO_PKG_VERSION") }
        }))),
        "notifications/initialized" => Json(json!({})),
        "tools/list" => Json(success(id, tools_list_response())),
        "tools/call" => {
            let params = req.get("params").cloned().unwrap_or(json!({}));
            let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
            if name != "branch_tab" {
                return Json(error(id, -32602, &format!("Unknown tool: {name}")));
            }
            let initial_prompt = parse_initial_prompt(&params);

            let payload = json!({
                "source_tab_id": tab_id,
                "initial_prompt": initial_prompt,
            });
            let _ = state.app.emit("branch-tab-request", payload);

            Json(success(id, json!({
                "content": [{
                    "type": "text",
                    "text": "Branched into a new Shep tab."
                }]
            })))
        }
        _ => Json(error(id, -32601, &format!("Method not found: {method}"))),
    }
}

pub(crate) fn tools_list_response() -> Value {
    json!({
        "tools": [{
            "name": "branch_tab",
            "description": "Fork this Claude session into a new Shep tab.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "initial_prompt": {
                        "type": "string",
                        "description": "Optional message to send to the new tab on spawn."
                    }
                }
            }
        }]
    })
}

pub(crate) fn parse_initial_prompt(params: &Value) -> Option<String> {
    params
        .get("arguments")
        .and_then(|a| a.get("initial_prompt"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn success(id: Option<Value>, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn error(id: Option<Value>, code: i64, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tools_list_exposes_branch_tab() {
        let response = tools_list_response();
        let tools = response.get("tools").and_then(|t| t.as_array()).expect("tools array");
        assert_eq!(tools.len(), 1);
        let tool = &tools[0];
        assert_eq!(tool.get("name").and_then(|v| v.as_str()), Some("branch_tab"));
        assert!(tool.get("description").and_then(|v| v.as_str()).is_some());
        let schema = tool.get("inputSchema").expect("inputSchema");
        assert_eq!(schema.get("type").and_then(|v| v.as_str()), Some("object"));
        let props = schema.get("properties").expect("properties");
        let prop = props.get("initial_prompt").expect("initial_prompt prop");
        assert_eq!(prop.get("type").and_then(|v| v.as_str()), Some("string"));
    }

    #[test]
    fn parse_initial_prompt_returns_some_when_present() {
        let params = json!({
            "name": "branch_tab",
            "arguments": { "initial_prompt": "hello world" }
        });
        assert_eq!(parse_initial_prompt(&params), Some("hello world".to_string()));
    }

    #[test]
    fn parse_initial_prompt_trims_whitespace() {
        let params = json!({
            "arguments": { "initial_prompt": "   trimmed   " }
        });
        assert_eq!(parse_initial_prompt(&params), Some("trimmed".to_string()));
    }

    #[test]
    fn parse_initial_prompt_empty_after_trim_is_none() {
        let params = json!({
            "arguments": { "initial_prompt": "   " }
        });
        assert_eq!(parse_initial_prompt(&params), None);
    }

    #[test]
    fn parse_initial_prompt_missing_arguments_is_none() {
        let params = json!({ "name": "branch_tab" });
        assert_eq!(parse_initial_prompt(&params), None);
    }

    #[test]
    fn parse_initial_prompt_missing_field_is_none() {
        let params = json!({ "arguments": {} });
        assert_eq!(parse_initial_prompt(&params), None);
    }

    #[test]
    fn parse_initial_prompt_non_string_is_none() {
        let params = json!({ "arguments": { "initial_prompt": 42 } });
        assert_eq!(parse_initial_prompt(&params), None);
    }
}
