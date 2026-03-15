# End-User Feedback Cleanup Review

This is a pre-share review of the current app state, focused on issues that could create security risk, confusing behavior, or a rough first impression for outside testers.

## What I checked

- Frontend and backend entry points
- Tauri config and command surface
- PTY/session lifecycle
- Repo/worktree flows
- Notifications and error handling
- Production build and existing tests

## Highest Priority Before Sharing

### 1. Restore a real Tauri CSP

- Severity: High
- Why it matters: the app frontend can invoke commands that open editors, spawn PTYs, run shell commands, and manipulate git/worktrees. With CSP disabled, any frontend injection bug becomes much more dangerous.
- Evidence:
  - `src-tauri/tauri.conf.json:30-32` sets `"csp": null`
  - `src-tauri/src/commands.rs:122-150` exposes PTY spawn/write/resize commands to the frontend
- Recommendation:
  - Add a restrictive CSP instead of shipping with `null`
  - Review whether any inline scripts/styles are forcing CSP to stay off
  - Treat this as a release blocker for anything beyond trusted internal use

### 2. Fix PTY exit reporting and command status handling

- Severity: High
- Why it matters: command failures and clean exits are not represented correctly. That will make the app feel unreliable fast.
- Evidence:
  - `src-tauri/src/pty/session.rs:147-148` always emits `Exit { code: 0 }`
  - `src/hooks/usePty.ts:100-105` marks every command exit as `"crashed"`, regardless of exit code
- User impact:
  - A successful short-lived command can look like a crash
  - A real failing command loses its real exit code
  - Session status indicators become hard to trust
- Recommendation:
  - Return the actual child exit status from Rust
  - Distinguish between clean exit, failure exit, and user-stopped process in the frontend

### 3. Stop shipping notification debug behavior

- Severity: High
- Why it matters: testers will get noisy notifications, and terminal message contents are being logged to the console.
- Evidence:
  - `src/lib/notifications.ts:20-23` asks for notification permission at startup
  - `src/lib/notifications.ts:27-37` logs notification payloads and sends notifications unconditionally
  - `src/lib/notifications.ts:31` still has a TODO about restoring the focus guard
  - `src/components/terminal/TerminalView.tsx:77-86` logs BEL and OSC notification payloads
- User impact:
  - Permission prompt appears before the user understands why
  - Notifications can fire even while the app is focused
  - Potentially sensitive terminal text ends up in logs
- Recommendation:
  - Only request permission after the user enables notifications or after first real notification need
  - Restore the unfocused-window guard
  - Remove debug logging before sharing builds

## Important Cleanup

### 4. Worktree cleanup is brittle and can leave junk behind

- Severity: Medium
- Why it matters: closing a worktree-backed assistant tab can silently leave orphaned worktrees/directories behind.
- Evidence:
  - `src/components/session/SessionLauncher.tsx:181-186` creates worktrees under `../.shep-worktrees/...`
  - `src/hooks/usePty.ts:338-342` tries to remove them on tab close but only logs a warning on failure
  - `src-tauri/src/git.rs:183-190` removes worktrees without `--force`
- User impact:
  - Dirty worktrees can fail removal
  - Testers may discover leftover branches/directories after a short evaluation
- Recommendation:
  - Decide whether worktree sessions are disposable or persistent and make the UI reflect that
  - Surface cleanup failures in the UI
  - Consider safer cleanup rules or a dedicated cleanup command

### 5. Project removal does not fully clear in-memory project state

- Severity: Medium
- Why it matters: removed projects can leave stale tabs/state behind in memory, which is a good recipe for weird behavior after a longer session.
- Evidence:
  - `src/components/layout/AppShell.tsx:184-193` kills PTYs and removes the repo, but only switches active project to `""`
  - `src/stores/useTerminalStore.ts:62-73`, `src/stores/useCommandStore.ts:62-73`, and `src/stores/useGitStore.ts:44-49` each define cleanup helpers that are not used in the removal flow
  - `src/components/layout/AppShell.tsx:434-448` renders `allTabs` across projects, even when hidden
- Recommendation:
  - Call the store-level `removeProject` cleanup methods during repo removal
  - Verify tab/activity cleanup for removed projects, not just PTY shutdown

### 6. Canonical path selection can pick the wrong repo when names collide

- Severity: Medium
- Why it matters: two repos with the same folder name can confuse the add-project flow.
- Evidence:
  - `src/stores/useRepoStore.ts:38-45` resolves the newly registered repo by matching `r.name === config.name`
- User impact:
  - Adding `~/work/api` and `~/archive/api` can select the wrong project
  - Commands/tabs could attach to the wrong repo entry
- Recommendation:
  - Return the canonical repo path directly from the backend registration call, or match on canonicalized path instead of repo name

### 7. Error handling is inconsistent: some failures are silent, others use blocking alerts

- Severity: Medium
- Why it matters: this makes the app feel flaky and unfinished.
- Evidence:
  - `src/components/layout/AppShell.tsx:123-126` and `src/components/layout/AppShell.tsx:317-321` use `window.alert`
  - `src/components/git/GitPanel.tsx:31-35`, `src/components/git/GitPanel.tsx:104-108`, `src/components/git/GitPanel.tsx:150-156`, and `src/components/git/GitPanel.tsx:164-169` swallow failures
- User impact:
  - Git actions can fail with no explanation
  - Other actions interrupt the user with browser-style alerts
- Recommendation:
  - Replace alerts and silent catches with a consistent toast/banner pattern
  - Show actionable failure text for git, worktree, and editor-launch errors

## Performance / UX Risks

### 8. Git polling may become noisy with more repos and worktrees

- Severity: Medium
- Why it matters: the app polls every five seconds across all repos plus active worktrees.
- Evidence:
  - `src/hooks/useGitPolling.ts:4-24`
  - `src/components/layout/AppShell.tsx:82-94`
  - `src/components/git/GitPanel.tsx:80-86`
- User impact:
  - More battery/CPU usage than expected
  - Potential UI hitching as the repo list grows
- Recommendation:
  - Poll only visible/active repos, or back off when the window is unfocused
  - Consider event-driven refresh after user actions

### 9. Hidden terminal views accumulate across projects

- Severity: Medium
- Why it matters: keeping terminals alive across project switches is useful, but the current approach keeps every tab mounted until explicitly removed.
- Evidence:
  - `src/components/layout/AppShell.tsx:434-448` renders `allTabs`, hiding inactive ones with CSS rather than unmounting them
- User impact:
  - Longer sessions with many tabs can consume more memory than expected
  - Combined with incomplete project cleanup, this can snowball
- Recommendation:
  - Add limits or cleanup rules for inactive tabs/projects
  - Measure memory after switching between several repos with many sessions

### 10. First-run experience still feels developer-oriented

- Severity: Medium
- Why it matters: outside testers will judge the first five minutes heavily.
- Evidence:
  - Immediate notification permission prompt: `src/lib/notifications.ts:20-23`
  - Raw install command popovers for missing assistants: `src/components/session/SessionLauncher.tsx:238-260`
  - Destructive project removal is a two-click context-menu action with no richer confirmation: `src/components/sidebar/ProjectItem.tsx:81-92`
- Recommendation:
  - Delay permissions until needed
  - Make install guidance more polished and explicit
  - Add clearer confirmation messaging before removing a project with running sessions

## Lower-Priority Code Quality Cleanup

### 11. The build is passing, but the main JS bundle is large

- Severity: Low to Medium
- Evidence:
  - `pnpm build` passes, but Vite warns about an `815.65 kB` minified chunk
- Why it matters:
  - Native shell helps, but big bundles still affect startup and responsiveness
- Recommendation:
  - Split overlays/panels and heavy terminal-related code where possible

### 12. Test coverage is thin around the riskiest flows

- Severity: Low to Medium
- Evidence:
  - `cargo test` passes, but only 3 Rust tests currently run, all around UTF-8 chunk decoding in `src-tauri/src/pty/session.rs`
  - I did not find frontend tests around repo switching, PTY lifecycle, worktree cleanup, or command status transitions
- Recommendation:
  - Add a small set of targeted tests around:
    - PTY exit status mapping
    - repo add/remove flows
    - worktree create/remove flows
    - command status transitions

## Suggested Pre-Feedback Triage

If you want the shortest practical punch list before handing this to testers, I would do these first:

1. Re-enable CSP and review the Tauri command surface.
2. Fix PTY exit/status accuracy.
3. Clean up notifications: remove debug logs, restore focus guard, delay permission prompts.
4. Fix project/worktree cleanup so closing or removing things leaves no residue.
5. Replace `window.alert` and silent catches with a basic in-app error pattern.

## Verification Run

- `pnpm build`: passed, with a large bundle size warning
- `cargo test`: passed, 3 tests total
