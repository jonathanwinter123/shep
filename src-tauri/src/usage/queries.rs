use rusqlite::{params, Connection};
use std::collections::{BTreeMap, HashMap};

use super::types::{
    LocalUsageDetails, UsageBreakdownItem, UsageNamedTokens, UsageOverview,
    UsageOverviewProvider, UsageProject, UsageTask, UsageTrendBucket,
    UsageTrendProviderValue,
};
use super::helpers::now_epoch_seconds;

/// Pricing rates per million tokens for a model.
struct ModelPricing {
    input_per_m: f64,
    output_per_m: f64,
    cache_read_per_m: f64,
    cache_write_per_m: f64,
    thoughts_per_m: f64,
}

/// Load all pricing patterns from the DB.
fn load_pricing(conn: &Connection) -> HashMap<String, ModelPricing> {
    let mut map = HashMap::new();
    let mut stmt = match conn.prepare(
        "SELECT model_pattern, input_per_m, output_per_m, cache_read_per_m, cache_write_per_m, thoughts_per_m FROM model_pricing"
    ) {
        Ok(s) => s,
        Err(_) => return map,
    };

    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            ModelPricing {
                input_per_m: row.get(1)?,
                output_per_m: row.get(2)?,
                cache_read_per_m: row.get(3)?,
                cache_write_per_m: row.get(4)?,
                thoughts_per_m: row.get(5)?,
            },
        ))
    });

    if let Ok(rows) = rows {
        for row in rows.flatten() {
            map.insert(row.0, row.1);
        }
    }
    map
}

/// Match a model name to a pricing pattern (prefix match).
fn find_pricing<'a>(model: &str, pricing: &'a HashMap<String, ModelPricing>) -> Option<&'a ModelPricing> {
    // Try exact match first
    if let Some(p) = pricing.get(model) {
        return Some(p);
    }
    // Try prefix match (e.g., "claude-opus-4-6" matches "claude-opus-4-6-20251101")
    let mut best_match: Option<(&str, &ModelPricing)> = None;
    for (pattern, p) in pricing {
        if model.starts_with(pattern.as_str()) {
            match best_match {
                Some((prev, _)) if pattern.len() > prev.len() => best_match = Some((pattern, p)),
                None => best_match = Some((pattern, p)),
                _ => {}
            }
        }
    }
    best_match.map(|(_, p)| p)
}

/// Calculate cost in USD for a set of token counts.
fn calculate_cost(pricing: &ModelPricing, input: i64, output: i64, cache_read: i64, cache_write: i64, thoughts: i64) -> f64 {
    (input as f64 * pricing.input_per_m
        + output as f64 * pricing.output_per_m
        + cache_read as f64 * pricing.cache_read_per_m
        + cache_write as f64 * pricing.cache_write_per_m
        + thoughts as f64 * pricing.thoughts_per_m)
        / 1_000_000.0
}

/// Calculate cost for a windowed query (total tokens by type for a given provider/cutoff).
fn windowed_cost(conn: &Connection, provider: &str, cutoff: i64, pricing: &HashMap<String, ModelPricing>) -> Option<f64> {
    let mut stmt = conn.prepare(
        "SELECT COALESCE(model, 'unknown'), SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
         FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2
         GROUP BY model"
    ).ok()?;

    let mut total_cost = 0.0;
    let mut has_any = false;

    let rows = stmt.query_map(params![provider, cutoff], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, i64>(5)?,
        ))
    }).ok()?;

    for row in rows.flatten() {
        let (model, input, output, cache_read, cache_write, thoughts) = row;
        if let Some(p) = find_pricing(&model, pricing) {
            total_cost += calculate_cost(p, input, output, cache_read, cache_write, thoughts);
            has_any = true;
        }
    }

    if has_any { Some(total_cost) } else { None }
}

/// Query the DB for local usage details for a given provider.
pub fn local_details(conn: &Connection, provider: &str) -> Option<LocalUsageDetails> {
    let now = now_epoch_seconds() as i64;
    let t5h = now - 18_000;
    let t7d = now - 604_800;
    let t30d = now - 2_592_000;

    let pricing = load_pricing(conn);

    // Time-windowed totals
    let (tokens_5h, tokens_7d, tokens_30d, tokens_total) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN timestamp >= ?2 THEN tokens_total ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN timestamp >= ?3 THEN tokens_total ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN timestamp >= ?4 THEN tokens_total ELSE 0 END), 0),
                COALESCE(SUM(tokens_total), 0)
             FROM usage_messages WHERE provider = ?1",
            params![provider, t5h, t7d, t30d],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?, row.get::<_, i64>(3)?)),
        )
        .ok()?;

    // Token type totals
    let (input, output, cache_write, cache_read, thoughts) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(tokens_input), 0),
                COALESCE(SUM(tokens_output), 0),
                COALESCE(SUM(tokens_cache_write), 0),
                COALESCE(SUM(tokens_cache_read), 0),
                COALESCE(SUM(tokens_thoughts), 0)
             FROM usage_messages WHERE provider = ?1",
            params![provider],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
            )),
        )
        .unwrap_or((0, 0, 0, 0, 0));

    let has_type_breakdown = input > 0 || output > 0;

    // Costs per window
    let cost_5h = windowed_cost(conn, provider, t5h, &pricing);
    let cost_7d = windowed_cost(conn, provider, t7d, &pricing);
    let cost_30d = windowed_cost(conn, provider, t30d, &pricing);
    let cost_total = windowed_cost(conn, provider, 0, &pricing);

    let top_models = query_top_models(conn, provider, &pricing);
    let top_tasks = query_top_tasks(conn, provider, &pricing);
    let top_projects = query_top_projects(conn, provider, &pricing);

    Some(LocalUsageDetails {
        source_type: "local".to_string(),
        confidence: "observed".to_string(),
        tokens_total: tokens_total as u64,
        tokens_input: if has_type_breakdown { Some(input as u64) } else { None },
        tokens_output: if has_type_breakdown { Some(output as u64) } else { None },
        tokens_cached: if has_type_breakdown { Some((cache_write + cache_read) as u64) } else { None },
        tokens_thoughts: if thoughts > 0 { Some(thoughts as u64) } else { None },
        tokens_5h: tokens_5h as u64,
        tokens_7d: tokens_7d as u64,
        tokens_30d: tokens_30d as u64,
        cost_total,
        cost_5h,
        cost_7d,
        cost_30d,
        top_models,
        top_tasks,
        top_projects,
    })
}

/// Query local details scoped to a specific time window.
pub fn windowed_details(conn: &Connection, provider: &str, window: &str) -> Option<LocalUsageDetails> {
    let now = now_epoch_seconds() as i64;
    let cutoff = match window {
        "5h" => now - 18_000,
        "7d" => now - 604_800,
        "30d" => now - 2_592_000,
        _ => return None,
    };

    let pricing = load_pricing(conn);

    let tokens_total: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(tokens_total), 0) FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2",
            params![provider, cutoff],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let (input, output, cache_write, cache_read, thoughts) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(tokens_input), 0),
                COALESCE(SUM(tokens_output), 0),
                COALESCE(SUM(tokens_cache_write), 0),
                COALESCE(SUM(tokens_cache_read), 0),
                COALESCE(SUM(tokens_thoughts), 0)
             FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2",
            params![provider, cutoff],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
            )),
        )
        .unwrap_or((0, 0, 0, 0, 0));

    let has_type_breakdown = input > 0 || output > 0;

    let cost_window = windowed_cost(conn, provider, cutoff, &pricing);

    let t5h = now - 18_000;
    let t7d = now - 604_800;
    let t30d = now - 2_592_000;
    let (tokens_5h, tokens_7d, tokens_30d) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN timestamp >= ?2 THEN tokens_total ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN timestamp >= ?3 THEN tokens_total ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN timestamp >= ?4 THEN tokens_total ELSE 0 END), 0)
             FROM usage_messages WHERE provider = ?1",
            params![provider, t5h, t7d, t30d],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?)),
        )
        .unwrap_or((0, 0, 0));

    let cost_5h = windowed_cost(conn, provider, t5h, &pricing);
    let cost_7d = windowed_cost(conn, provider, t7d, &pricing);
    let cost_30d = windowed_cost(conn, provider, t30d, &pricing);

    let top_models = query_top_models_since(conn, provider, cutoff, &pricing);
    let top_tasks = query_top_tasks_since(conn, provider, cutoff, &pricing);
    let top_projects = query_top_projects_since(conn, provider, cutoff, &pricing);

    Some(LocalUsageDetails {
        source_type: "local".to_string(),
        confidence: "observed".to_string(),
        tokens_total: tokens_total as u64,
        tokens_input: if has_type_breakdown { Some(input as u64) } else { None },
        tokens_output: if has_type_breakdown { Some(output as u64) } else { None },
        tokens_cached: if has_type_breakdown { Some((cache_write + cache_read) as u64) } else { None },
        tokens_thoughts: if thoughts > 0 { Some(thoughts as u64) } else { None },
        tokens_5h: tokens_5h as u64,
        tokens_7d: tokens_7d as u64,
        tokens_30d: tokens_30d as u64,
        cost_total: cost_window,
        cost_5h,
        cost_7d,
        cost_30d,
        top_models,
        top_tasks,
        top_projects,
    })
}

fn query_top_models(conn: &Connection, provider: &str, pricing: &HashMap<String, ModelPricing>) -> Vec<UsageNamedTokens> {
    query_top_models_since(conn, provider, 0, pricing)
}

fn query_top_models_since(conn: &Connection, provider: &str, since: i64, pricing: &HashMap<String, ModelPricing>) -> Vec<UsageNamedTokens> {
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(model, 'unknown'), SUM(tokens_total), SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
             FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2
             GROUP BY model ORDER BY 2 DESC LIMIT 5",
        )
        .unwrap();

    stmt.query_map(params![provider, since], |row| {
        let name: String = row.get(0)?;
        let tokens = row.get::<_, i64>(1)? as u64;
        let input: i64 = row.get(2)?;
        let output: i64 = row.get(3)?;
        let cache_read: i64 = row.get(4)?;
        let cache_write: i64 = row.get(5)?;
        let thoughts: i64 = row.get(6)?;
        Ok((name, tokens, input, output, cache_read, cache_write, thoughts))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .map(|(name, tokens, input, output, cache_read, cache_write, thoughts)| {
        let cost = find_pricing(&name, pricing)
            .map(|p| calculate_cost(p, input, output, cache_read, cache_write, thoughts));
        UsageNamedTokens { name, tokens, cost }
    })
    .collect()
}

fn query_top_tasks(conn: &Connection, provider: &str, pricing: &HashMap<String, ModelPricing>) -> Vec<UsageTask> {
    query_top_tasks_since(conn, provider, 0, pricing)
}

fn query_top_tasks_since(conn: &Connection, provider: &str, since: i64, pricing: &HashMap<String, ModelPricing>) -> Vec<UsageTask> {
    let mut stmt = conn
        .prepare(
            "SELECT session_id, COALESCE(project, ''), SUM(tokens_total), MAX(model), MAX(timestamp),
                    SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
             FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2
             GROUP BY session_id ORDER BY 3 DESC LIMIT 5",
        )
        .unwrap();

    stmt.query_map(params![provider, since], |row| {
        let session_id: String = row.get(0)?;
        let project: String = row.get(1)?;
        let tokens: i64 = row.get(2)?;
        let model: Option<String> = row.get(3)?;
        let updated_at: Option<i64> = row.get(4)?;
        let input: i64 = row.get(5)?;
        let output: i64 = row.get(6)?;
        let cache_read: i64 = row.get(7)?;
        let cache_write: i64 = row.get(8)?;
        let thoughts: i64 = row.get(9)?;
        Ok((session_id, project, tokens, model, updated_at, input, output, cache_read, cache_write, thoughts))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .map(|(session_id, project, tokens, model, updated_at, input, output, cache_read, cache_write, thoughts)| {
        let cost = model.as_deref()
            .and_then(|m| find_pricing(m, pricing))
            .map(|p| calculate_cost(p, input, output, cache_read, cache_write, thoughts));
        UsageTask {
            id: session_id.clone(),
            label: session_id,
            tokens: tokens as u64,
            cost,
            model,
            project: if project.is_empty() { None } else { Some(project) },
            updated_at: updated_at.map(|t| t.to_string()),
        }
    })
    .collect()
}

fn query_top_projects(conn: &Connection, provider: &str, pricing: &HashMap<String, ModelPricing>) -> Vec<UsageProject> {
    query_top_projects_since(conn, provider, 0, pricing)
}

fn query_top_projects_since(conn: &Connection, provider: &str, since: i64, pricing: &HashMap<String, ModelPricing>) -> Vec<UsageProject> {
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(project, 'unknown'), SUM(tokens_total), COUNT(DISTINCT session_id),
                    SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
             FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2
             GROUP BY project ORDER BY 2 DESC LIMIT 5",
        )
        .unwrap();

    stmt.query_map(params![provider, since], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, i64>(5)?,
            row.get::<_, i64>(6)?,
            row.get::<_, i64>(7)?,
        ))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .map(|(name, tokens, sessions, _input, _output, _cache_read, _cache_write, _thoughts)| {
        let cost = windowed_cost_for_project(conn, provider, since, &name, pricing);
        UsageProject {
            name,
            tokens: tokens as u64,
            cost,
            sessions: Some(sessions as u64),
        }
    })
    .collect()
}

/// Calculate cost for a specific project by summing per-model costs.
fn windowed_cost_for_project(conn: &Connection, provider: &str, since: i64, project: &str, pricing: &HashMap<String, ModelPricing>) -> Option<f64> {
    let mut stmt = conn.prepare(
        "SELECT COALESCE(model, 'unknown'), SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
         FROM usage_messages WHERE provider = ?1 AND timestamp >= ?2 AND COALESCE(project, 'unknown') = ?3
         GROUP BY model"
    ).ok()?;

    let mut total_cost = 0.0;
    let mut has_any = false;

    let rows = stmt.query_map(params![provider, since, project], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, i64>(5)?,
        ))
    }).ok()?;

    for row in rows.flatten() {
        let (model, input, output, cache_read, cache_write, thoughts) = row;
        if let Some(p) = find_pricing(&model, pricing) {
            total_cost += calculate_cost(p, input, output, cache_read, cache_write, thoughts);
            has_any = true;
        }
    }

    if has_any { Some(total_cost) } else { None }
}

pub fn usage_overview(conn: &Connection, window: &str) -> Option<UsageOverview> {
    let now = now_epoch_seconds() as i64;
    let (cutoff, bucket_size, bucket_count) = match window {
        "5h" => (now - 18_000, 1_200_i64, 15_i64),
        "7d" => (now - 604_800, 43_200_i64, 14_i64),
        "30d" => (now - 2_592_000, 86_400_i64, 30_i64),
        _ => return None,
    };

    let pricing = load_pricing(conn);
    let trend = query_trend(conn, cutoff, bucket_size, bucket_count, &pricing);
    let providers = query_provider_summaries(conn, cutoff, &pricing, &trend);
    let total_tokens: u64 = providers.iter().map(|p| p.tokens).sum();
    let total_cost_value: f64 = providers.iter().filter_map(|p| p.cost).sum();
    let total_cost = providers.iter().any(|p| p.cost.is_some()).then_some(total_cost_value);
    let top_models = query_top_models_all(conn, cutoff, &pricing, bucket_size, bucket_count);
    let top_projects = query_top_projects_all(conn, cutoff, &pricing, bucket_size, bucket_count);
    let active_projects = count_distinct(conn, cutoff, "COALESCE(project, '')", true);
    let active_sessions = count_distinct(conn, cutoff, "session_id", false);

    Some(UsageOverview {
        window: window.to_string(),
        total_tokens,
        total_cost,
        active_projects,
        active_sessions,
        providers,
        trend,
        top_models,
        top_projects,
    })
}

fn query_provider_summaries(
    conn: &Connection,
    since: i64,
    pricing: &HashMap<String, ModelPricing>,
    trend: &[UsageTrendBucket],
) -> Vec<UsageOverviewProvider> {
    let mut stmt = conn
        .prepare(
            "SELECT provider, SUM(tokens_total), SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
             FROM usage_messages
             WHERE timestamp >= ?1
             GROUP BY provider
             ORDER BY 2 DESC",
        )
        .unwrap();

    let raw: Vec<(String, u64, Option<f64>)> = stmt
        .query_map(params![since], |row| {
            let provider: String = row.get(0)?;
            let tokens = row.get::<_, i64>(1)? as u64;
            let cost = windowed_cost_for_provider(conn, &provider, since, pricing);
            Ok((provider, tokens, cost))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    let total_tokens: u64 = raw.iter().map(|(_, tokens, _)| *tokens).sum();

    raw.into_iter()
        .map(|(provider, tokens, cost)| UsageOverviewProvider {
            trend: trend
                .iter()
                .map(|bucket| {
                    bucket
                        .providers
                        .iter()
                        .find(|entry| entry.provider == provider)
                        .map(|entry| entry.tokens)
                        .unwrap_or(0)
                })
                .collect(),
            provider,
            tokens,
            cost,
            share_percent: if total_tokens > 0 {
                tokens as f64 / total_tokens as f64 * 100.0
            } else {
                0.0
            },
        })
        .collect()
}

fn query_trend(
    conn: &Connection,
    since: i64,
    bucket_size: i64,
    bucket_count: i64,
    pricing: &HashMap<String, ModelPricing>,
) -> Vec<UsageTrendBucket> {
    let aligned_start = since - (since.rem_euclid(bucket_size));
    let mut bucket_map: BTreeMap<i64, BTreeMap<String, (u64, f64, bool)>> = BTreeMap::new();

    let mut stmt = conn
        .prepare(
            "SELECT provider,
                    ((timestamp - ?1) / ?2) as bucket_idx,
                    COALESCE(model, 'unknown'),
                    SUM(tokens_total),
                    SUM(tokens_input),
                    SUM(tokens_output),
                    SUM(tokens_cache_read),
                    SUM(tokens_cache_write),
                    SUM(tokens_thoughts)
             FROM usage_messages
             WHERE timestamp >= ?3
             GROUP BY provider, bucket_idx, model",
        )
        .unwrap();

    let rows = stmt
        .query_map(params![aligned_start, bucket_size, since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
            ))
        })
        .unwrap();

    for row in rows.flatten() {
        let (provider, bucket_idx, model, tokens, input, output, cache_read, cache_write, thoughts) = row;
        if bucket_idx < 0 || bucket_idx >= bucket_count {
            continue;
        }
        let provider_map = bucket_map.entry(bucket_idx).or_default();
        let entry = provider_map.entry(provider).or_insert((0, 0.0, false));
        entry.0 += tokens as u64;
        if let Some(p) = find_pricing(&model, pricing) {
            entry.1 += calculate_cost(p, input, output, cache_read, cache_write, thoughts);
            entry.2 = true;
        }
    }

    (0..bucket_count)
        .map(|bucket_idx| {
            let start = aligned_start + bucket_idx * bucket_size;
            let end = start + bucket_size;
            let providers = bucket_map
                .get(&bucket_idx)
                .map(|items| {
                    items
                        .iter()
                        .map(|(provider, (tokens, cost, has_cost))| UsageTrendProviderValue {
                            provider: provider.clone(),
                            tokens: *tokens,
                            cost: (*has_cost).then_some(*cost),
                        })
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            let tokens = providers.iter().map(|p| p.tokens).sum();
            let cost_sum: f64 = providers.iter().filter_map(|p| p.cost).sum();
            let has_cost = providers.iter().any(|p| p.cost.is_some());

            UsageTrendBucket {
                start,
                end,
                label: format_bucket_label(bucket_idx, bucket_count, bucket_size),
                tokens,
                cost: has_cost.then_some(cost_sum),
                providers,
            }
        })
        .collect()
}

fn query_top_models_all(
    conn: &Connection,
    since: i64,
    pricing: &HashMap<String, ModelPricing>,
    bucket_size: i64,
    bucket_count: i64,
) -> Vec<UsageBreakdownItem> {
    let mut stmt = conn
        .prepare(
            "SELECT provider, COALESCE(model, 'unknown'), SUM(tokens_total), SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
             FROM usage_messages
             WHERE timestamp >= ?1
             GROUP BY provider, model
             ORDER BY 3 DESC
             LIMIT 6",
        )
        .unwrap();

    stmt.query_map(params![since], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, i64>(5)?,
            row.get::<_, i64>(6)?,
            row.get::<_, i64>(7)?,
        ))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .map(|(provider, label, tokens, input, output, cache_read, cache_write, thoughts)| {
        let cost = find_pricing(&label, pricing)
            .map(|p| calculate_cost(p, input, output, cache_read, cache_write, thoughts));
        let trend = query_named_trend(conn, since, bucket_size, bucket_count, "model", &provider, &label);
        UsageBreakdownItem {
            provider,
            label,
            tokens: tokens as u64,
            cost,
            sessions: None,
            trend,
        }
    })
    .collect()
}

fn query_top_projects_all(
    conn: &Connection,
    since: i64,
    pricing: &HashMap<String, ModelPricing>,
    bucket_size: i64,
    bucket_count: i64,
) -> Vec<UsageBreakdownItem> {
    let mut stmt = conn
        .prepare(
            "SELECT provider, COALESCE(project, 'unknown'), SUM(tokens_total), COUNT(DISTINCT session_id)
             FROM usage_messages
             WHERE timestamp >= ?1
             GROUP BY provider, project
             ORDER BY 3 DESC
             LIMIT 6",
        )
        .unwrap();

    stmt.query_map(params![since], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
        ))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .map(|(provider, label, tokens, sessions)| {
        let cost = windowed_cost_for_project(conn, &provider, since, &label, pricing);
        let trend = query_named_trend(conn, since, bucket_size, bucket_count, "project", &provider, &label);
        UsageBreakdownItem {
            cost,
            provider,
            label,
            tokens: tokens as u64,
            sessions: Some(sessions as u64),
            trend,
        }
    })
    .collect()
}

fn query_named_trend(
    conn: &Connection,
    since: i64,
    bucket_size: i64,
    bucket_count: i64,
    dimension: &str,
    provider: &str,
    label: &str,
) -> Vec<u64> {
    let aligned_start = since - (since.rem_euclid(bucket_size));
    let column = match dimension {
        "model" => "COALESCE(model, 'unknown')",
        "project" => "COALESCE(project, 'unknown')",
        _ => return vec![0; bucket_count as usize],
    };

    let query = format!(
        "SELECT ((timestamp - ?1) / ?2) as bucket_idx, SUM(tokens_total)
         FROM usage_messages
         WHERE timestamp >= ?3 AND provider = ?4 AND {column} = ?5
         GROUP BY bucket_idx
         ORDER BY bucket_idx"
    );

    let mut values = vec![0; bucket_count as usize];
    let mut stmt = match conn.prepare(query.as_str()) {
        Ok(stmt) => stmt,
        Err(_) => return values,
    };

    let rows = match stmt.query_map(params![aligned_start, bucket_size, since, provider, label], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
    }) {
        Ok(rows) => rows,
        Err(_) => return values,
    };

    for row in rows.flatten() {
        let (bucket_idx, tokens) = row;
        if bucket_idx >= 0 && bucket_idx < bucket_count {
            values[bucket_idx as usize] = tokens as u64;
        }
    }

    values
}

fn windowed_cost_for_provider(conn: &Connection, provider: &str, since: i64, pricing: &HashMap<String, ModelPricing>) -> Option<f64> {
    let mut stmt = conn.prepare(
        "SELECT COALESCE(model, 'unknown'), SUM(tokens_input), SUM(tokens_output), SUM(tokens_cache_read), SUM(tokens_cache_write), SUM(tokens_thoughts)
         FROM usage_messages
         WHERE provider = ?1 AND timestamp >= ?2
         GROUP BY model"
    ).ok()?;

    let mut total_cost = 0.0;
    let mut has_any = false;

    let rows = stmt.query_map(params![provider, since], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, i64>(4)?,
            row.get::<_, i64>(5)?,
        ))
    }).ok()?;

    for row in rows.flatten() {
        let (model, input, output, cache_read, cache_write, thoughts) = row;
        if let Some(p) = find_pricing(&model, pricing) {
            total_cost += calculate_cost(p, input, output, cache_read, cache_write, thoughts);
            has_any = true;
        }
    }

    if has_any { Some(total_cost) } else { None }
}

fn count_distinct(conn: &Connection, since: i64, field: &str, skip_empty: bool) -> u64 {
    let query = if skip_empty {
        format!(
            "SELECT COUNT(DISTINCT {field}) FROM usage_messages WHERE timestamp >= ?1 AND {field} != ''"
        )
    } else {
        format!("SELECT COUNT(DISTINCT {field}) FROM usage_messages WHERE timestamp >= ?1")
    };

    conn.query_row(query.as_str(), params![since], |row| row.get::<_, i64>(0))
        .unwrap_or(0) as u64
}

fn format_bucket_label(bucket_idx: i64, bucket_count: i64, bucket_size: i64) -> String {
    let buckets_ago = bucket_count.saturating_sub(bucket_idx + 1);
    let span = buckets_ago * bucket_size;

    if buckets_ago == 0 {
        return "now".to_string();
    }

    if span >= 86_400 {
        format!("-{}d", span / 86_400)
    } else if span >= 3_600 {
        format!("-{}h", span / 3_600)
    } else {
        format!("-{}m", span / 60)
    }
}
