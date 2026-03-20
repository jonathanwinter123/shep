use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageNamedTokens {
    pub name: String,
    pub tokens: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageTask {
    pub id: String,
    pub label: String,
    pub tokens: u64,
    pub model: Option<String>,
    pub project: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageProject {
    pub name: String,
    pub tokens: u64,
    pub sessions: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageWindowSnapshot {
    pub provider: String,
    pub window: String,
    pub label: String,
    pub source_type: String,
    pub confidence: String,
    pub used_percent: Option<f64>,
    pub remaining_percent: Option<f64>,
    pub reset_at: Option<String>,
    pub token_total: Option<u64>,
    pub pace_status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalUsageDetails {
    pub source_type: String,
    pub confidence: String,
    pub tokens_total: u64,
    pub tokens_input: Option<u64>,
    pub tokens_output: Option<u64>,
    pub tokens_cached: Option<u64>,
    pub tokens_thoughts: Option<u64>,
    pub tokens_5h: u64,
    pub tokens_7d: u64,
    pub tokens_30d: u64,
    pub top_models: Vec<UsageNamedTokens>,
    pub top_tasks: Vec<UsageTask>,
    pub top_projects: Vec<UsageProject>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderUsageSnapshot {
    pub provider: String,
    pub status: String,
    pub fetched_at: String,
    pub summary_windows: Vec<UsageWindowSnapshot>,
    pub extra_windows: Vec<UsageWindowSnapshot>,
    pub local_details: Option<LocalUsageDetails>,
    pub error: Option<String>,
}
