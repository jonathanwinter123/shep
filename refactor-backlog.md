# Refactor Backlog

Structural cleanup pulled out of `CLEANUP.md` and `end-user-feedback-cleanup.md` so it stays separate from the current pre-share fixes.

## Highest-Value Refactors

### 1. Split `AppShell.tsx`

- Extract project lifecycle/actions from terminal rendering.
- Move overlay/panel orchestration into a small view-state module.
- Pull repo removal and workspace persistence into dedicated hooks/services.

### 2. Split `SessionLauncher.tsx`

- Separate assistant availability checks from git/worktree preparation.
- Move branch/worktree naming rules into a pure helper module.
- Isolate the install guidance UI from launch orchestration.

### 3. Break up `usePty.ts`

- Separate PTY transport concerns from command/session state sync.
- Isolate worktree cleanup rules from generic PTY tab close behavior.
- Make lifecycle/status transitions explicit and testable.

### 4. Reduce `useUIStore.ts` boilerplate

- Replace repeated open/close/activate/deactivate/toggle methods with a generic panel state helper or reducer.

### 5. Make theme definitions data-driven

- `src/lib/themes.ts` is mostly repetitive object data and can be collapsed into a more compact shape without changing behavior.

## Supporting Cleanup

### 6. Pull inline subcomponents out of large files

- `CommandsPanel.tsx`: extract `CommandRow`.
- `TabBar.tsx`: extract draggable tab item + overlay tab item.

### 7. Centralize constants and naming rules

- Default terminal size.
- Session/worktree branch prefixes and suffixes.
- Z-index scale.

### 8. Revisit hidden tab mounting strategy

- Measure memory impact of keeping all terminals mounted.
- Decide whether inactive tabs should be cached, suspended, or evicted.

## Suggested Order

1. `usePty.ts`
2. `AppShell.tsx`
3. `SessionLauncher.tsx`
4. `useUIStore.ts`
5. Remaining cleanup
