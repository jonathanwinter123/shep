# Shep Usage Tracking Redesign TODOs

North star: Shep shows where AI usage is going in the user's actual development workflow without duplicating the same dashboard in multiple places.

## Phase 1: Foundations

- [x] Add cost provenance to backend query results.
  - [x] Keep existing numeric `cost` fields for compatibility.
  - [x] Add `costDetail` metadata with amount, kind, basis, and confidence.
  - [x] Mark provider-recorded costs separately from list-price estimates.
  - [x] Mark mixed aggregates when recorded and estimated costs are combined.
  - [ ] Add estimate-to-recorded reconciliation metadata for sessions.

- [ ] Add provider-native quota window model.
  - [x] Extend snapshot/window types with provider window identity and reset bounds.
  - [x] Preserve provider API reset times as authoritative.
  - [ ] Query local observed usage within provider window bounds when available.
  - [x] Keep app-level reporting periods separate from quota windows.

- [ ] Add project canonicalization.
  - [x] Store raw provider labels.
  - [x] Resolve absolute paths and symlinks.
  - [x] Walk to Git repo roots.
  - [ ] Preserve worktree and branch attribution.
  - [x] Fuzzy match non-path labels by basename.
  - [x] Add low-confidence alias review queue.

## Phase 2: Main Usage Panel

- [x] Remove the right panel experiment and keep usage detail in the main panel.
- [x] Add clearer row columns for Providers, Models, and Projects.
  - [x] Label Cost and token anatomy explicitly: input, output, cache, total.
  - [x] Show cost provenance on each row: recorded, list-price, included, free, unknown, or mixed.
  - [x] Rename `Estimated Cost` summary copy to `Cost` with provenance metadata.
  - [x] Rename `Tool Breakdown` to `Model Breakdown` until actual tool-call attribution exists.

- [ ] Add provider-native quota status.
  - [x] Most constrained window first.
  - [x] Rename UI label from Rate Limits to Subscription Utilization.
  - [ ] Coarse status only for v1: on pace, burning hot, throttle imminent, unknown.
  - [ ] Defer precise ETA until provider windows are stable.
  - [x] Keep Gemini 24h provider windows split by model tier where provider data supports it.

- [ ] Add cache efficiency.
  - [ ] Cache hit rate.
  - [ ] Cache read/write token breakdown.
  - [ ] Estimated cache savings where pricing supports it.

- [ ] Add worktree attribution.
  - [ ] Keep out of the primary overview until project canonicalization is reliable.
  - [ ] Today and current-session costs.
  - [ ] Recorded spend and list-price equivalent.
  - [ ] Session count and top model.

## Phase 3: Sidebar

- [ ] Replace mini-dashboard rows with single-schema status rows.
  - [ ] Subscription/quota providers show most-constrained quota window.
  - [ ] Paid/recorded providers show spend.
  - [ ] Unknown providers show `—`.
  - [ ] Add provenance badge: recorded, estimated, included, free, unknown, mixed.
  - [x] Click opens the main usage panel.

## Phase 4: Full Usage Panel

- [ ] Keep full panel retrospective and configuration-focused.
  - [ ] Tabs: Overview, Providers, Projects, Sessions, Models, Budgets.
  - [x] Split the visible row meaning into Cost, Cost provenance, and Tokens.
  - [ ] Split aggregates into Spend, List-price equivalent, and Tokens.
  - [ ] Add cost-source distribution to overview.
  - [ ] Add Projects review queue for canonicalization.
  - [ ] Add estimate-to-recorded drift in Sessions.
  - [x] Keep budget configuration here.

## Deferred

- [ ] Precise burn-rate ETA.
- [ ] Per-tool spend.
- [ ] Live ticker.
- [ ] Soft budget guard before send.
- [ ] Model-switch recommendations.
