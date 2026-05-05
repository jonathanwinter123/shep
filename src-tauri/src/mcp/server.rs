use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::{Path, State},
    routing::post,
    Json, Router,
};
use serde_json::{json, Value};
use tauri::AppHandle;
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
    let _tab_id = match state.registry.lookup(&token) {
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
        "tools/list" => Json(success(id, json!({ "tools": [] }))),
        _ => Json(error(id, -32601, &format!("Method not found: {method}"))),
    }
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
