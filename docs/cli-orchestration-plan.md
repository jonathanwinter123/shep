# CLI Orchestration Plan

## Summary

Shep should let agents running in different CLI sessions communicate with each other through a Shep-owned message bus. Today each PTY is a silo — the user copies output between them by hand. We make that motion a first-class product feature, then expose the same capability to the agents themselves so one agent can call another for backup, review, or implementation.

We are not building a chatbot, an autonomous orchestrator, or an ACP/MCP-first protocol stack. Those are later. The first question we answer is narrower:

> Can one running agent pass useful context to another running agent, and can Shep record, route, and deliver those messages reliably?

## Core Insight

Shep's identity is **the communication layer**, not the terminal grid. The terminals are a rendering concern. The product is the message bus, the inboxes, the artifacts, and the replayable event log that sit above them.

The key design move: **raw PTY writes are a delivery mechanism, not the message system.** The OpenClaw community has already tried to solve this with shared files and bot-mention hacks — they broke. A sanctioned, Shep-owned bus is what makes this reliable. Every message has state (queued / delivered / read), a delivery policy (now / when-idle / needs-approval), and references to shared artifacts — not a blob of terminal text stuffed into a prompt.

Every CLI agent already runs bash. We use that to expose the bus via a local CLI (`shepctl`) in v1. MCP tools over the same backend come later.

## Prior Art Considered

This plan takes the best of several existing projects and adds Shep's product layer:

- **AWS CLI Agent Orchestrator (CAO)** — local HTTP server, tmux session isolation, MCP tools, `CAO_TERMINAL_ID` env identity, and three verbs: `handoff` / `assign` / `send_message`. We adopt the vocabulary so CAO-trained agents work in Shep.
- **agtx** — SQLite-backed task state, idle push notifications, `allowed_actions` gating before state transitions, stuck detection. We borrow these state primitives.
- **CodeMachine** — separation of *signals* (user control) from *directives* (agent-initiated requests). Agents request state changes; Shep decides whether to honor them.
- **ORCH** — broadcast-to-all primitive, review gates, structured JSONL event logs.
- **Ceph orchestrator** — capability detection, subset support, common vocabulary across heterogeneous backends.
- **OpenClaw issue #54781** — anti-pattern evidence: agents writing shared files and pinging each other over external chat does not work. Shep must provide a sanctioned bus.
- **Superset** — closest peer product (Electron desktop app for parallel agent sessions with worktrees). Useful for UX pattern reference.
- **ACP / claude-agent-acp** — deferred. Not the v1 transport. Worth revisiting as a capability-specific upgrade for agents that speak it.

## Non-Goals (for v1)

- A "Shep brain" that plans or decomposes tasks
- ACP adapters or protocol conversion
- MCP server (the same backend will expose MCP later — but ship CLI first)
- Autonomous fan-out / debate / consensus modes (MCO-style; deferred)
- Worktree isolation per agent (Superset/ORCH do this; v2+)
- Perfect xterm screen reconstruction (plain stripped text is enough for v1)
- Cross-project handoffs
- Provider-specific structured output adapters

## Data Model

Five first-class objects. Persist these in SQLite (already used by the app).

### `AgentSession`

Every Shep agent tab is a session. On spawn, Shep injects identity into the process environment.

```
AgentSession {
  id: string                    // UUID, stable across restarts
  pty_id: number                // current PTY, may change on restart
  assistant_id: string | null   // claude, codex, gemini, opencode, pi
  label: string
  repo_path: string
  owner: "human" | "orchestrator" | "worker"
  status: "idle" | "active" | "waiting" | "exited"
  capabilities: Capability[]    // see below
}
```

Injected environment variables on spawn:

```
SHEP_SESSION_ID=<session uuid>
SHEP_PROJECT_ID=<repo id>
SHEP_ORCHESTRATOR_ID=<session uuid of caller, if any>
SHEP_CTL=<path to shepctl>
```

The `SHEP_SESSION_ID` pattern is borrowed from CAO's `CAO_TERMINAL_ID` — it's how the backend knows which session is calling when an agent invokes `shepctl` or MCP tools.

### `AgentMessage`

The core communication primitive.

```
AgentMessage {
  id: string
  from_session_id: string | null     // null = user or system
  to_session_id: string
  type: "message" | "handoff" | "assignment" | "result" | "user_signal"
  status: "queued" | "delivered" | "read" | "acked" | "failed"
  delivery_policy: "now" | "when_idle" | "queue_only" | "needs_approval"
  body: string                        // the composed prompt / instruction
  artifact_ids: string[]              // referenced, not inlined
  created_at: timestamp
  delivered_at: timestamp | null
  parent_message_id: string | null    // for handoff -> result chains
}
```

### `AgentArtifact`

Named, referenceable content. Messages reference artifacts instead of inlining everything.

```
AgentArtifact {
  id: string
  type: "tail" | "summary" | "review" | "diff" | "test_output" | "plan" | "file_snapshot"
  source_session_id: string | null
  label: string
  content: string                     // may be large — store in a blob table
  created_at: timestamp
  bytes: number
}
```

### `AgentEvent`

Append-only audit log. Drives history UI, replay, debugging.

```
AgentEvent {
  id: string
  session_id: string | null
  type:
    | "session.started"
    | "session.exited"
    | "session.idle"
    | "session.stuck"
    | "message.queued"
    | "message.delivered"
    | "message.acked"
    | "handoff.started"
    | "handoff.completed"
    | "artifact.created"
    | "directive.requested"
    | "directive.approved"
    | "directive.denied"
    | "signal.sent"
  payload: JSON
  created_at: timestamp
}
```

### `AgentDirective`

Agent-initiated requests for state changes. Agents don't mutate state — they request, Shep decides. This is the CodeMachine insight.

```
AgentDirective {
  id: string
  from_session_id: string
  type: "handoff_to" | "request_review" | "pause" | "escalate_to_user" | "ask_user" | "checkpoint" | "stop"
  allowed: boolean                    // determined by policy
  status: "pending" | "approved" | "denied" | "auto"
  payload: JSON
  created_at: timestamp
  resolved_at: timestamp | null
}
```

Signals (from the user) and directives (from agents) travel different paths, even when they perform the same action. One is authoritative, the other is advisory.

### Capabilities

Not every session supports every operation. Detect and record on spawn:

```
Capability =
  | "send_text"        // PTY write works
  | "read_tail"        // we can capture output
  | "wait_idle"        // idle detection is meaningful
  | "structured_events" // ACP/MCP agents
  | "tool_calls"       // agent exposes tools back to Shep
  | "cancel"           // graceful cancellation supported
```

PTY-based assistants get `{send_text, read_tail, wait_idle, cancel}`. ACP-wrapped Claude (if we add it later) gets the full set. Shep's API must degrade gracefully when capabilities are missing.

## Communication Semantics

Three verbs. Compatible with CAO at the vocabulary level so agents trained on CAO just work.

### `message`

Fire-and-forget. Post to a target session's inbox. Delivered according to `delivery_policy`.

> Use for: "heads up," "here's some context," "I'm working on X, don't step on it."

### `handoff`

Synchronous. Post a message, wait for the target to respond, return the response as an artifact. Caller's session blocks (logically — actually just waits for the reply event).

> Use for: "Claude, review this diff and tell me what's wrong," "Codex, implement what I just planned."

### `assign`

Asynchronous. Spawn a fresh session (or reuse a named one), start the task, return immediately. The caller gets a session ID back; the result posts to the caller's inbox when done.

> Use for: "Gemini, research this dependency in the background while I keep working."

## Delivery Engine

This is the piece that makes the bus feel intentional rather than random.

For each message, pick a delivery moment:

- **now** — target is idle; write immediately.
- **when_idle** — target is active; queue, watch activity, deliver on idle transition.
- **queue_only** — don't auto-deliver; require a user action or another signal.
- **needs_approval** — show the user a confirmation first (default for cross-agent traffic from untrusted orchestrators in future iterations).

Idle detection is a heuristic (see Risks). The engine must combine signals:

1. Output quiet for N ms
2. Shell-prompt pattern detected at end of buffer
3. Agent-reported ready state (when available via structured events)
4. Hard timeout fallback

When delivering, the engine writes the composed prompt to the PTY, records the event, and flips message status to `delivered`.

## Architecture

Three layers, built in order.

1. **Backend core** (Rust) — data model, transcript capture, message bus, delivery engine, event log.
2. **User-facing UI** (React) — "Send to…" dialog, handoff history, inbox badges, artifact browser.
3. **External surfaces** — `shepctl` CLI first, MCP server later. Both are thin clients over the same core.

## Phases

### Phase 1 — Foundation: Data Model + Transcript Capture

No product UX yet. Lay the plumbing.

**Backend (Rust):**

- Add SQLite tables: `agent_sessions`, `agent_messages`, `agent_artifacts`, `agent_events`, `agent_directives`.
- Add a rolling transcript per PTY session (ring buffer, ~1000 plain-text lines, ANSI stripped).
- On spawn, create an `AgentSession` row, inject `SHEP_SESSION_ID` / `SHEP_PROJECT_ID` / `SHEP_CTL` env vars.
- Track session status transitions (idle / active / exited) and emit `session.*` events.

**Tauri commands:**

```
list_sessions() -> [AgentSession]
get_session_tail(session_id, lines) -> string
create_artifact(type, source_session_id, label, content) -> AgentArtifact
list_events(filter) -> [AgentEvent]
```

**Files touched:**

- `src-tauri/src/pty/session.rs` — ring buffer, idle tracking
- `src-tauri/src/pty/manager.rs` — session identity, env injection
- `src-tauri/src/db/` — new, SQLite schema and migrations
- `src-tauri/src/bus/` — new, in-memory state over the DB

**Done when:** spawning an assistant creates a session row, its tail is queryable, and all lifecycle events are logged.

### Phase 2 — Manual "Send to…" UI

The product win. Users experience Shep as an agent manager.

From any assistant tab, a **Send to…** action opens a dialog:

- Target session (picker across active assistant sessions in the project)
- Action template: *Review* / *Implement* / *Explain* / *Test* / *Continue* / *Custom*
- Optional free-text instruction
- Context to include (auto-creates artifacts):
  - Recent output from source session (N lines of tail)
  - Current git diff
  - Selected files
  - Previous artifacts from history

On submit: Shep composes the prompt, creates an `AgentMessage` with referenced `artifact_ids`, queues it through the delivery engine. The target tab shows a pending-message badge; on delivery, the tab flashes and the message is written to its PTY.

Crucial: the UI creates a **message**, not a direct PTY write. The write happens in the delivery engine, not the button handler. This is the difference between a terminal hack and a real product.

**Files touched:**

- `src/components/terminal/TerminalView.tsx` — "Send to…" button
- `src/components/layout/TabBar.tsx` — inbox badge per tab
- `src/components/handoff/AgentHandoffDialog.tsx` — new
- `src/components/handoff/HandoffHistoryPanel.tsx` — new
- `src/stores/useHandoffStore.ts` — new

**Done when:** a user can pick a template, compose a message with referenced artifacts, and have it delivered to another agent's PTY with full state recorded.

### Phase 3 — Delivery Engine

Make delivery intentional. Teach Shep when to interrupt and when to wait.

- Implement `now` / `when_idle` / `queue_only` / `needs_approval` policies.
- Idle detection: output-quiet timer + shell-prompt regex + capability-aware structured signals.
- Queue visualizer in the target tab: "1 message waiting, will deliver on next idle."
- Manual override: user can force-send a queued message.
- Emit `message.delivered`, `session.idle` events.

**Done when:** sending while a target is mid-turn queues instead of interrupting, and the message delivers automatically when the target goes idle.

### Phase 4 — `shepctl` CLI and Agent Identity

Expose the bus to agents themselves. Milestone 2 of the original plan, but now backed by a real message model.

**The binary:**

```
shepctl sessions list --json
shepctl session tail <id> --lines 120
shepctl session wait-idle <id> --quiet-ms 5000 --timeout-ms 300000

shepctl inbox list
shepctl inbox read <message-id>
shepctl inbox ack <message-id>

shepctl message send --to <id> --text "..." [--artifact <id>...]
shepctl handoff --to <id> --text "..." [--wait]
shepctl assign --agent <assistantId> --task "..." [--wait]

shepctl artifact create --type <type> --from-tail <session-id> --lines 120
shepctl artifact get <id>

shepctl directive request --type handoff_to --target <session-id>
```

Talks to the Tauri backend over a loopback Unix socket (or 127.0.0.1 with a per-session token in `SHEP_CTL_TOKEN`). No new business logic — `shepctl` is a thin client.

**Agent discovery (critical path):**

`shepctl` only works if agents know it exists. On spawn, inject a short system/context hint describing the available commands and when to use them. Store the hint as an artifact so it's editable, not hard-coded. Make this injection toggleable via setting.

**Done when:** a Codex session can run `shepctl sessions list`, send a message to a Claude session, wait for its response, and read it back — all recorded as messages, artifacts, and events.

### Phase 5 — MCP Surface

Additive, not a replacement. The same backend exposed as MCP tools.

```
list_sessions
send_message
handoff
assign
read_session_tail
list_inbox
create_artifact
read_artifact
request_directive
```

Agents that speak MCP natively (Claude Code, Codex, Gemini) get typed tool discovery and schemas instead of shelling out. `shepctl` still works for bash-only workflows. **Do not build two backends** — MCP tools are thin adapters over the same handlers `shepctl` calls.

**Done when:** Claude Code can see Shep's tools via MCP without any shell invocation and perform the same flows as the Phase 4 `shepctl` demo.

### Phase 6 — Task Board + Stuck Detection

The layer above that makes Shep feel like a coordinated workspace.

- **Task board UI** — messages typed `handoff` or `assignment` surface as cards with status (queued, delivered, working, waiting-review, done, stuck).
- **Dependency links** — cards can reference each other (inspired by Cline Kanban).
- **Stuck detection** — sessions that have been "active" for > N minutes with no meaningful progress get flagged; Shep emits `session.stuck` events and surfaces a banner.
- **Review gates** — before messages of type `result` are accepted back into the caller's flow, optional user review (inspired by ORCH).
- **Allowed-actions gating** — directives like `escalate_to_user` or `handoff_to` are validated against a policy (inspired by agtx).

**Done when:** a user can launch an orchestrator agent, have it spawn and manage multiple workers, and watch the whole workflow on a live board with stuck detection and review gates.

## What Gets Validated At Each Phase

Each phase is shippable on its own.

| Phase | User-visible value                                          |
|-------|-------------------------------------------------------------|
| 1     | Nothing yet (plumbing)                                      |
| 2     | "Shep is an agent manager, not a terminal grid"             |
| 3     | Messages feel intentional, not interruptive                 |
| 4     | Agents coordinate themselves via `shepctl`                  |
| 5     | MCP-native agents get first-class tool access               |
| 6     | Shep is a team workspace with visible coordination state    |

Ship Phase 2 and stop if nothing else proves useful. The plan is structured so each phase compounds but does not require the next.

## Risks and Open Questions

### Idle detection is a heuristic

"Output quiet for N ms" breaks on slow token streams, mid-task permission prompts, long-running bash commands the agent kicked off, and TUI screens where the cursor is idle but the app is not.

Mitigations:

- Layer signals: quiet timer + shell-prompt pattern + (where available) structured ready signal
- Always enforce a hard `timeout_ms` cap
- Surface "I think this is done, confirm?" affordances in the UI — don't pretend we know
- Log heuristic decisions as `session.idle` events so users can see why a message was delivered

### Agent discovery of `shepctl` / MCP tools

Phase 4 depends on agents knowing the tools exist. Plan for:

- Context injection on spawn (default on, toggleable)
- A user setting to customize the hint
- Fallback: the user can prompt the agent manually ("you have access to `shepctl`, try `shepctl --help`")

### Message body bloat

Large tails inflate costs. Mitigations:

- Default tail size of 120 lines, tunable per-template
- Artifacts are byte-counted and can be truncated or summarized before injection
- Eventually: a "summarize before send" option that routes through a cheap model

### Loopback security

`shepctl` exposes "write to any PTY." The backend socket must reject non-loopback connections, require a per-session token in `SHEP_CTL_TOKEN`, and audit every call in the event log. Not optional.

### CAO vocabulary drift

We adopt CAO's verbs (`handoff` / `assign` / `send_message`) for compatibility, but Shep's richer model (delivery policy, artifacts, directives) has no CAO analog. If CAO's protocol evolves, we'll need to decide whether to stay compatible or diverge. Accept this cost now; revisit at Phase 5.

### Capability detection for heterogeneous runtimes

Not every provider supports `wait_idle` reliably. Not every provider is a PTY. Phase 1 records capabilities per session; every subsequent feature must degrade when capabilities are missing. Do not assume uniformity.

## First Milestone, Stated Plainly

The bar for calling Phase 2 successful:

**A user can take Claude's output, click one button, and have Codex receive it as a composed message with referenced artifacts — delivered when Codex is idle, recorded as a first-class message in Shep's history, and replayable.**

Everything else follows.
