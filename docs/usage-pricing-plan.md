# Usage Pricing Plan

## Summary

We should stop treating all providers the same.

- For direct providers like Claude, Gemini, and Codex, continue using our local token ingestion plus pricing lookup approach.
- For OpenCode, prefer OpenCode's own stored usage and cost data from its local database instead of reconstructing cost ourselves.

This gives us better accuracy, less maintenance, and a cleaner path for new models.

## What We Learned

### Current Shep behavior

Shep currently estimates cost from:

- provider-specific token ingestion
- a local `model_pricing` SQLite table
- per-million token pricing lookup by model

This is useful, but it is only an estimate.

### Token fidelity today

- Claude: we capture input, output, cache write, and cache read separately.
- Gemini: we capture cached tokens, but not a clean read/write split.
- Codex: we capture cached input, but not a separate cache write signal.

So the direct-provider data is decent enough to estimate costs, but not billing-grade.

### OpenCode behavior

OpenCode already stores rich usage data in its own local DB at:

- `~/.local/share/opencode/opencode.db`

Assistant message records include:

- `cost`
- `tokens.total`
- `tokens.input`
- `tokens.output`
- `tokens.reasoning`
- `tokens.cache.read`
- `tokens.cache.write`
- `modelID`
- `providerID`

From local inspection:

- cache token fidelity is strong
- cost is sometimes already populated
- some OpenCode-routed/free models correctly show `cost: 0`
- some provider-backed models show nonzero stored cost

That means OpenCode should be treated as a source of recorded cost, not just a source of raw token counts.

## Recommended Direction

## 1. Keep direct-provider estimation for Claude, Gemini, and Codex

For these providers, keep the current Shep model:

- ingest token usage from provider-local files/logs
- look up prices from local SQLite
- calculate estimated cost in Shep

Recommended refinement:

- ship a bundled pricing snapshot with the app update
- store that snapshot in Shep's SQLite DB
- make network refresh optional, not required for startup correctness

## 2. Add a separate OpenCode ingestion path

For OpenCode, do not force it through the same pricing-estimation path.

Instead:

- read OpenCode session/message data from `opencode.db`
- use OpenCode's stored token buckets
- use OpenCode's stored `cost` first when available
- only estimate cost ourselves when OpenCode does not provide meaningful cost and we still want a fallback estimate

## 3. Distinguish recorded cost from estimated cost

We should model cost provenance explicitly.

Suggested categories:

- `recorded`: cost came directly from the source system, such as OpenCode
- `estimated`: cost was calculated by Shep from token counts and local pricing
- `unknown`: no cost available

This should be reflected in the backend data model first. UI labeling can follow.

## Proposed Implementation Plan

## Phase 1: Stabilize direct-provider pricing

- Keep `model_pricing` in Shep SQLite as the source of truth for estimated pricing.
- Seed it from bundled snapshot data that ships with the app.
- Avoid relying on a full runtime `models.dev` fetch during normal startup.
- Keep provider-aware pricing keys as `(provider, model_pattern)`.

Optional later:

- add a manual or background refresh path
- only run it opportunistically
- never make UI cost reads depend on live network availability

## Phase 2: Add OpenCode support

- Add a new OpenCode ingestion module in Shep.
- Read OpenCode data from `~/.local/share/opencode/opencode.db`.
- Parse assistant message JSON from the `message` table.
- Map these fields into Shep usage storage:
  - provider
  - model
  - tokens_input
  - tokens_output
  - tokens_thoughts
  - tokens_cache_read
  - tokens_cache_write
  - tokens_total
  - recorded cost, if present

Important behavior:

- if OpenCode provides nonzero cost, treat it as authoritative
- if OpenCode provides zero cost for a clearly free/routed-free model, preserve zero
- if OpenCode cost is absent or unclear, optionally estimate later using Shep pricing rules

## Phase 3: Add cost provenance support

Schema/backend changes:

- add a way to store `recorded_cost` separately from `estimated_cost`, or
- add a `cost_source` field alongside cost values

Query behavior:

- prefer recorded cost when present
- otherwise use estimated cost
- surface source/confidence in API responses

UI behavior:

- no immediate redesign required
- later, optionally show a subtle label such as `Recorded` vs `Estimated`

## Questions To Resolve

### 1. Do we want any runtime external pricing sync at all?

Options:

- snapshot only
- snapshot + manual refresh
- snapshot + occasional background refresh

Current recommendation:

- snapshot + optional refresh

### 2. Should OpenCode fallback to Shep-estimated pricing?

Options:

- no, only show OpenCode-recorded cost
- yes, estimate only when cost is missing and model pricing is available

Current recommendation:

- yes, but only as fallback, and clearly mark it as estimated

### 3. Do we need historical price versioning?

Right now, Shep estimation uses current local prices. That means historical direct-provider sessions are not billing-accurate if vendor pricing changes later.

Current recommendation:

- not required for this phase
- worth revisiting later if we want stronger accounting fidelity

## Why This Plan Is Better

- It uses the best available source for each system.
- It avoids overengineering a universal pricing pipeline.
- It reduces dependence on fragile runtime catalog fetches.
- It improves accuracy for OpenCode immediately.
- It keeps the current Shep direct-provider path intact where it is already decent.

## Near-Term Recommendation

The next implementation change should be:

1. back out the assumption that one external pricing sync solves everything
2. keep local pricing for Claude/Gemini/Codex
3. add OpenCode ingestion from `opencode.db`
4. support recorded vs estimated cost in the backend

That is the most practical and accurate plan from what we found.
