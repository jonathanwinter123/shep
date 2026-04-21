# Agent Communication Plan

## Goal

Improve Shep's existing CLI-agent workflow by making communication between running agents explicit, observable, and easy to trigger.

The first version should not replace the current PTY-based assistant sessions, introduce a new chatbot, or require every provider to support ACP/MCP. Shep should keep launching Claude Code, Codex, Gemini, OpenCode, Pi, and shell sessions as normal CLI tools, then add a communication layer around those sessions.

The product outcome:

```text
Launch agents.
Send one agent's output to another.
Ask for backup or a second review.
Track who sent what to whom.
Let an orchestrator agent coordinate workers through simple local commands.
```

## Product Principles

- Keep CLI agents as the primary surface.
- Make handoffs user-directed before making them autonomous.
- Preserve current PTY behavior and compatibility.
- Borrow existing communication vocabulary where it is already good. AWS CLI Agent Orchestrator's `handoff`, `assign`, and `send_message` primitives are the best current fit.
- Implement the communication layer against Shep's existing PTY/session stack instead of adding tmux as a required runtime.
- Treat ACP, MCP, Codex app-server, and Claude stream-json as optional runtime improvements, not the foundation.
- Start with useful plain-text communication, then add structure where it proves valuable.
- Make context explicit: users should be able to see what was sent to another agent.

## Non-Goals For The First Version

- Do not convert existing agents to ACP.
- Do not build a full autonomous planner.
- Do not build a replacement chat assistant.
- Do not require provider-specific SDK integrations.
- Do not attempt perfect terminal/TUI screen reconstruction first.
- Do not allow agents to freely control every human-owned session by default.

## Existing App Shape

Current assistants are launched as PTY-backed tabs:

- Assistant config lives in `src/components/sidebar/constants.ts`.
- `usePty.ts` launches assistant commands and handles PTY events.
- `PtyManager` and `PtySession` own backend process lifecycle.
- Tabs currently identify terminal-like sessions by `ptyId`.
- xterm.js renders live terminal state for humans.

This means the safest path is additive:

```text
existing PTY sessions
  + rolling transcript capture
  + handoff UI
  + CAO-compatible communication primitives
  + local CLI and MCP surfaces over the same backend
  + later structured adapters
```

## Research Conclusion

AWS CLI Agent Orchestrator (CAO) is the closest existing match for Shep's desired communication layer. CAO uses a local server, per-terminal identity, MCP tools, and three core communication modes:

```text
handoff
  synchronous task transfer; wait for completion and return output

assign
  asynchronous task delegation; worker continues in background and reports back later

send_message
  direct message to an existing agent/session inbox
```

Shep should adopt this vocabulary and aim for protocol compatibility where practical, while replacing CAO's tmux-backed session runtime with Shep's existing PTY manager.

The first implementation should not depend on CAO's server as a permanent production dependency. It is useful as a reference and compatibility target, but Shep already owns the running terminals, tabs, activity state, git context, and user permissions. A Rust-native implementation keeps the communication layer integrated with the app and avoids running two session managers.

CAO compatibility target:

```text
CAO concept         Shep implementation
terminal id         SHEP_SESSION_ID / ptyId-backed AgentSession
tmux session        existing PtySession
local HTTP server   Shep loopback control API or sidecar bridge
MCP tools           Shep MCP tools over the same backend
handoff             Shep handoff record + prompt delivery + wait/result capture
assign              Shep task/session spawn + async inbox result
send_message        Shep inbox message + queued delivery to PTY
```

Other tools reinforce this direction:

- ORCH: direct messages, broadcasts, shared context, state-machine review gates.
- CodeMachine: context passing, placeholders, user signals, agent directives, hybrid control.
- agtx: task board, `read_pane_content`, `send_to_task`, allowed actions, stuck detection.
- MCO: parallel fan-out, chain/debate modes, consensus aggregation; likely worth integrating later instead of rebuilding multi-agent review from scratch.
- Superset/Cline Kanban/Scion: worktree isolation and visual task monitoring matter, but they are later product layers rather than the first communication primitive.

## Core Concepts

### Agent Session

A running Shep-managed CLI session.

Initial identity can be based on the existing PTY tab:

```ts
AgentSession {
  id: string;
  ptyId: number;
  tabId: string;
  assistantId: string | null;
  label: string;
  repoPath: string;
  commandName: string | null;
  alive: boolean;
  active: boolean;
  exitCode: number | null;
  owner: "human" | "orchestrator" | "worker";
}
```

When Shep launches an agent, inject stable identity into its environment:

```bash
SHEP_SESSION_ID=<session-id>
SHEP_PROJECT_ID=<project-id>
SHEP_ORCHESTRATOR_ID=<session-id-if-worker>
```

This mirrors CAO's `CAO_TERMINAL_ID` pattern while keeping names Shep-specific. A compatibility alias can be considered later if we want CAO-oriented prompts/tools to work with minimal changes:

```bash
CAO_TERMINAL_ID=<session-id>
```

### Transcript

A plain-text view of recent output from a session.

The first implementation should store a rolling text tail. It does not need to be a perfect terminal screen model.

```ts
SessionTranscript {
  ptyId: number;
  tail: string[];
  lastActivityAt: number;
  exitCode: number | null;
}
```

Later, a headless terminal parser can add a rendered visible screen snapshot.

### Handoff

A synchronous task transfer. The caller sends a task to a target session or newly spawned worker, waits for completion/idle, and receives output.

```ts
AgentHandoff {
  id: string;
  fromPtyId: number | null;
  toPtyId: number;
  action: "review" | "implement" | "explain" | "test" | "continue" | "custom";
  instruction: string;
  contextArtifactIds: string[];
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
  resultArtifactId: string | null;
}
```

The important behavior is that Shep can answer:

```text
What did we send?
Who did we send it to?
Which agent produced the source material?
```

### Assignment

An asynchronous delegation. The caller starts or targets a worker and returns immediately with a task/session id.

```ts
AgentAssignment {
  id: string;
  fromSessionId: string | null;
  toSessionId: string;
  instruction: string;
  contextArtifactIds: string[];
  status: "queued" | "delivered" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
}
```

### Inbox Message

A direct message to an existing session. Messages are owned by Shep and delivered according to policy, rather than blindly writing to the PTY.

```ts
AgentInboxMessage {
  id: string;
  fromSessionId: string | null;
  toSessionId: string;
  type: "message" | "handoff" | "assignment" | "result" | "user_signal";
  status: "queued" | "delivered" | "read" | "acked" | "failed";
  body: string;
  contextArtifactIds: string[];
  deliveryPolicy: "now" | "when_idle" | "manual";
  createdAt: string;
  deliveredAt: string | null;
}
```

### Artifact

A reusable piece of context created by a session, a handoff, git state, or a user selection.

```ts
AgentArtifact {
  id: string;
  type: "tail" | "summary" | "review" | "diff" | "test_output" | "plan" | "custom";
  sourceSessionId: string | null;
  content: string;
  createdAt: string;
}
```

Messages, handoffs, and assignments should pass artifact references where possible. This keeps communication auditable and avoids copying huge blobs through every step.

## Phase 1: Rolling Transcript Capture

### Objective

Make each PTY session queryable by other app features.

### Backend Work

Add a rolling transcript buffer to the PTY backend.

Likely files:

- `src-tauri/src/pty/session.rs`
- `src-tauri/src/pty/manager.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/tauri.ts`
- `src/lib/types.ts`

Initial behavior:

- Store recent plain-text output per PTY session.
- Strip or simplify ANSI escape sequences enough for prompt context.
- Track `lastActivityAt`.
- Track exit state.
- Keep the buffer bounded, for example 2,000 lines or a byte cap.

Add Tauri commands:

```ts
listAgentSessions(): Promise<AgentSession[]>
getSessionTail(ptyId: number, lines: number): Promise<string>
waitSessionIdle(ptyId: number, quietMs: number, timeoutMs: number): Promise<void>
```

`waitSessionIdle` can start with output-quiet detection. It does not need semantic completion detection.

Raw PTY write remains available internally, but user/agent communication should go through inbox messages, handoffs, or assignments so delivery can be recorded and governed.

### Acceptance Criteria

- The app can list running assistant/terminal sessions.
- The app can retrieve the last N lines of plain text output from a session.
- The app can wait until a target PTY has produced no output for a quiet period.
- Existing terminal rendering and input continue to work unchanged.

## Phase 2: Manual Handoff UI

### Objective

Let the user send one agent's recent output to another agent with a clear instruction.

### UX

Add a `Send to...` action for assistant tabs.

Possible entry points:

- Tab context menu.
- Toolbar/action button inside a terminal tab.
- Keyboard command later.

Dialog fields:

```text
Target session:
  Claude / Codex / Gemini / OpenCode / Pi / Terminal

Action:
  Review
  Implement
  Explain
  Test
  Continue
  Custom

Context:
  Recent output from this session
  Current git diff
  Optional selected files later

Instruction:
  Free-form user instruction
```

Generated prompt shape:

```text
You are receiving a handoff from another Shep-managed agent session.

Source: Claude Code
Action: Review

User instruction:
Find flaws in this plan and recommend what should be implemented next.

Context from source session:
<recent source output>
```

Send behavior:

- Create an inbox message or handoff record.
- Deliver the prompt into the target session according to the selected delivery policy.
- Append a newline by default.
- Record source, target, included artifacts, and delivery status.
- Optionally switch focus to the target tab.

### Likely Files

- `src/components/terminal/TerminalView.tsx`
- `src/components/layout/TabBar.tsx`
- `src/stores/useTerminalStore.ts`
- new `src/components/agents/AgentHandoffDialog.tsx`
- new `src/stores/useAgentHandoffStore.ts`
- `src/lib/types.ts`

### Acceptance Criteria

- User can send recent output from Claude to Codex.
- User can send Codex's result back to Claude.
- User sees and can edit the prompt before sending.
- Handoffs/messages are recorded in app state.
- Existing assistant launch/close behavior is unaffected.

## Phase 3: CAO-Compatible Communication API

### Objective

Allow CLI agents to coordinate Shep sessions using the same high-level primitives proven by CAO.

Shep should implement the server side against its existing PTY manager. CAO is the protocol/reference model; tmux is not part of Shep's required architecture.

### Minimum Operations

```text
list_sessions
read_session_tail
send_message
handoff
assign
wait_session_idle
list_inbox
```

Semantics:

- `send_message`: direct message to an existing session inbox; queued if needed.
- `handoff`: send task and wait for target output/idle/result artifact.
- `assign`: start or target a worker asynchronously; return task/session id immediately.

### Transport Surfaces

Expose the same backend through two surfaces:

```text
MCP tools
  best for agent discovery and typed tool use

shepctl CLI
  best for debugging and agents without MCP support
```

The MCP surface should come earlier than originally planned because CAO demonstrates that typed tools solve the "how does the agent know the control API exists?" problem better than prompt instructions alone.

`shepctl` should remain available because every CLI agent can run shell commands and it gives humans a simple debugging path.

### Local Server / IPC

Use a local control API owned by the running Shep app:

- Localhost HTTP server with a per-app capability token, or
- Unix domain socket, with an HTTP-like request model on top.

CAO uses a localhost server; matching that shape will make compatibility and testing easier. The API must be private to the local user and current app instance.

### Compatibility Spike

Before building the full API, run a short spike against CAO:

```text
1. Install/run CAO separately.
2. Verify Claude Code/Codex/Gemini behavior on this machine.
3. Record the exact MCP tool names, request shapes, response shapes, and session lifecycle.
4. Decide whether Shep should mirror CAO tool schemas exactly or expose a Shep-native superset with CAO aliases.
```

Do not commit Shep to running CAO as a managed subprocess until this spike proves it gives more value than a Rust-native implementation.

### Orchestrator Workflow

The target workflow:

```bash
shepctl sessions list --json
shepctl send-message --to <session-id> --text "Review this architecture and list risks."
shepctl handoff --to <session-id> --text "Review this plan and return risks." --wait
shepctl assign --agent codex --text "Implement option B and report back."
```

An orchestrator agent can then summarize worker outputs inside its own CLI session.

### Acceptance Criteria

- A running CLI agent can list available Shep sessions.
- A running CLI agent can send a direct message to an existing worker session.
- A running CLI agent can perform a synchronous handoff and receive a result.
- A running CLI agent can assign background work and receive a session/task id.
- A running CLI agent can read the worker's tail output.
- Control is limited by ownership/permission rules.

## Phase 4: Ownership And Permissions

### Objective

Prevent uncontrolled cross-session writes while still making orchestration useful.

### Initial Policy

- Human-created sessions are human-owned.
- Orchestrator-created sessions are worker-owned by that orchestrator.
- Orchestrators can read/write sessions they created.
- Human-owned sessions are not writable by orchestrators unless explicitly shared.
- Reading human-owned sessions should require explicit sharing or a user setting.
- Interrupting/killing sessions requires approval unless the orchestrator owns them.

Session sharing modes:

```text
private
shared-read
shared-read-write
orchestrator-owned
```

### UI Indicators

Tabs should eventually show whether a session is:

```text
human-owned
worker-owned
shared read-only
shared read/write
```

### Acceptance Criteria

- `shepctl` cannot write to arbitrary human sessions by default.
- Users can explicitly share a session with an orchestrator.
- The UI makes ownership clear enough to avoid surprises.

## Phase 5: Better Runtime Adapters

### Objective

Improve communication quality for providers that expose structured control surfaces.

This phase should come after the basic communication loop works.

Potential adapters:

- Claude Code managed task via `claude -p --output-format stream-json`.
- Codex managed task via `codex app-server`.
- OpenCode via `opencode acp`.
- Gemini via CLI JSON mode if available.
- Pi via RPC mode if available.

The app-level concept remains the same:

```text
AgentSession / AgentRun / Handoff
```

The runtime only changes how Shep captures events and sends input.

## Phase 6: MCP Tooling And Compatibility

### Objective

Expose the same communication primitives to model-backed coordinators through MCP, and align the tool schema with CAO where the compatibility spike shows it is practical.

MCP should reuse the same backend as `shepctl`.

Potential tools:

```text
list_sessions
read_session_tail
read_session_screen
send_message
handoff
assign
wait_session_idle
list_inbox
read_inbox_message
git_status
git_diff
```

If the CAO compatibility spike confirms stable tool schemas, prefer CAO-compatible tool names and response envelopes.

## First Milestone

The first milestone should prove manual agent communication:

```text
1. Launch Claude and Codex as normal PTY assistants.
2. Ask Claude for a design or review.
3. Use "Send to..." from Claude's tab.
4. Choose Codex as the target.
5. Include Claude's recent output and a user instruction.
6. Codex receives the prompt automatically.
7. Send Codex's result back to Claude for review.
```

This milestone is complete when that workflow works reliably without changing how current assistant sessions launch.

## Second Milestone

The second milestone should prove agent-driven coordination:

```text
1. Launch one CLI agent as an orchestrator.
2. Launch two worker agents.
3. The orchestrator discovers Shep communication tools through MCP or `shepctl`.
4. The orchestrator uses `assign` to start one background worker task.
5. The orchestrator uses `handoff` for one synchronous review task.
6. The orchestrator uses `send_message` for a follow-up to an existing worker.
7. The orchestrator reads worker output/artifacts.
8. The orchestrator summarizes agreement, disagreement, and next steps.
```

No ACP, browser automation, or worktree isolation is required for this milestone.

## Third Milestone

The third milestone should prove reuse instead of reinvention for fan-out review:

```text
1. Install or detect MCO.
2. Run a multi-agent review against current diff or staged files.
3. Import the MCO result as a Shep artifact.
4. Let the user send the consensus findings to a running agent.
```

This should be treated as an integration experiment before building Shep's own consensus/debate engine.

## Open Questions

- Should transcript capture happen only in Rust, or should the frontend also expose xterm buffer snapshots for comparison?
- How much transcript history is enough for useful handoffs?
- Should handoffs be persisted to disk immediately or kept in app state first?
- Should `Send to...` be available from all terminal tabs or only assistant tabs?
- Should worker sessions be created automatically from the handoff dialog?
- Should Shep mirror CAO MCP schemas exactly or provide Shep-native schemas with CAO aliases?
- Should `CAO_TERMINAL_ID` be injected as a compatibility alias for `SHEP_SESSION_ID`?
- Is spawning CAO as a managed subprocess ever worth the extra session manager, or should Shep only reimplement compatible primitives?
- What is the safest IPC shape for the local control API?
- Should `shepctl` be bundled as a sidecar binary or installed/exported from the app?
- How should the app represent sessions that are waiting for human input rather than idle?
- Should worktree isolation become the default for orchestrator-created worker sessions?
- Should MCO be an optional integration for multi-agent review before Shep builds native fan-out/consensus?

## Recommended Implementation Order

1. Run a CAO compatibility spike and record tool/request/response shapes.
2. Add backend transcript capture and session identity.
3. Add message/inbox/artifact records.
4. Add manual `Send to...` UI backed by inbox messages/handoffs.
5. Implement Shep-native `send_message`, `handoff`, and `assign` against the existing PTY stack.
6. Expose those primitives through MCP and `shepctl`.
7. Add ownership, sharing, and delivery policies.
8. Evaluate MCO integration for fan-out review/consensus.
9. Add provider-specific structured adapters where useful.
