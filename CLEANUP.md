# Shep - Pre-Release Cleanup Audit

A review of areas to address before sharing Shep with end users.

---

## 1. Security

### CSP Disabled

`src-tauri/tauri.conf.json` sets `"csp": null`, disabling Content Security Policy entirely. Even as a desktop app, enabling a basic CSP (`default-src 'self'`) adds defense-in-depth.

### macOS Private API

`macos-private-api: true` is enabled in both `Cargo.toml` and `tauri.conf.json` for transparency effects. This is intentional but worth documenting for users — Apple may reject apps using private APIs from the App Store.

### No Input Length Limits

Command names, branch names, and project names have no length validation. Extremely long input could cause layout issues or unexpected behavior.

---

## 2. Error Handling

### `window.alert()` for Errors

Two places use raw `window.alert(String(error))` to show errors:

- `AppShell.tsx:125` — workspace save failure
- `AppShell.tsx:321` — editor open failure

These display raw technical messages (e.g., `ENOENT: no such file or directory`). Should use a styled in-app error toast or modal.

### Silent Failures

Several operations fail silently with only `console.error()` — no UI feedback:

- PTY spawn failure (`usePty.ts:184`)
- Git operations in `GitPanel.tsx` (stage, unstage, worktree)
- Settings save in keybinding and terminal settings stores

### Swallowed Errors

Multiple `.catch(() => {})` blocks suppress errors completely:

- `usePty.ts:208, 329, 355` — PTY kill operations
- Various git branch/list calls in `SessionLauncher.tsx`

### Inconsistent Error Display

Only editor settings errors are surfaced in `SettingsPanel.tsx`. Keybinding and terminal settings store errors exist in state but are never rendered.

---

## 3. Console Logging in Production

These should be removed or gated behind a dev/debug flag:

| File | Lines | Content |
|------|-------|---------|
| `notifications.ts` | 28, 34, 36 | `[shep] notifyAgent`, notification sent/error |
| `TerminalView.tsx` | 78, 84 | BEL/OSC 9 received logging |
| `TerminalView.tsx` | 153, 159 | Canvas/WebGL renderer fallback warnings |
| `usePty.ts` | 184, 259, 313 | PTY operation errors |
| `AppShell.tsx` | 124, 320 | Workspace save and editor errors |
| `SessionLauncher.tsx` | 201 | Session launch errors |

### Incomplete TODO

`notifications.ts:31` — `// TODO: restore 'if (!focused)' guard after testing`. The focus guard is disabled, so notifications fire even when the app is focused.

---

## 4. UX & Missing Feedback

### No Loading Indicators

These async operations provide no visual feedback while processing:

- Terminal spawn / command start
- Git file list and worktree fetching
- Branch switching in `BranchDropdown.tsx`
- Session launching (button has `launching` state but no spinner/disabled style)
- Settings load on panel open

### Missing Success Feedback

- "Copy Path" in sidebar context menu — no "Copied!" toast
- Workspace save — success is completely silent
- Project removal — no confirmation that it worked
- Command start/stop — no status change notification

### No Version Info Visible

Users have no way to see what version of Shep they're running. Important for bug reports.

### No Window State Persistence

Window starts at hardcoded 1200x800. Size and position are not remembered between sessions.

---

## 5. Accessibility

### Missing ARIA Labels

- Tab buttons in `TabBar.tsx` — no `aria-label` or `aria-selected`
- Project buttons in `ProjectItem.tsx` — no accessible name
- Assistant picker buttons in `SessionLauncher.tsx` — no labels
- Drag region in `AppShell.tsx` — no accessible name

### No Keyboard Navigation

- `ContextMenu.tsx` — doesn't trap focus or support arrow key navigation
- Dropdown menus lack focus management
- No visible focus rings on most interactive elements

### Color Contrast

- Idle status dot uses `rgba(255, 255, 255, 0.25)` — very low contrast
- Status relies on color alone (red = crash, green = running) without text/icon fallback for colorblind users

### Missing Alt Text

- Theme preview circles in `SettingsPanel.tsx` — no alt text
- Assistant logos in `SessionLauncher.tsx` — use empty `alt=""`

---

## 6. Code Quality

### Large Files to Consider Splitting

| File | Lines | Concern |
|------|-------|---------|
| `AppShell.tsx` | 458 | Manages repos, terminals, overlays, panels — does too much |
| `SessionLauncher.tsx` | 454 | Assistant selection, branch management, session launch mixed together |
| `usePty.ts` | 370 | PTY spawning, commands, shells, assistants, cleanup all in one hook |
| `themes.ts` | 459 | 8 repetitive theme definitions — could be data-driven |
| `CommandsPanel.tsx` | 348 | `CommandRow` subcomponent defined inline |
| `TabBar.tsx` | 307 | Tab management with drag-and-drop logic |

### Repetitive Store Patterns

`useUIStore.ts` duplicates `open/close/activate/deactivate/toggle` methods for 4 panels (~120 lines of boilerplate). A generic panel manager or reducer would eliminate this.

### Magic Numbers

- `TerminalView.tsx:187` — `setTimeout(..., 100)` without explanation
- `AppShell.tsx:65` — default terminal size `{ cols: 80, rows: 24 }` hardcoded
- Branch naming strings (`"shep"`, `"-yolo"`, `"-wt"`) scattered across `SessionLauncher.tsx`

---

## 7. Styling & Layout

### Fixed Widths

- Sidebar is `w-72` (288px) fixed — no resize handle, long paths get clipped
- Git panel file list is `width: 280px` hardcoded in CSS
- Font sizes hardcoded in pixels (`13px`, `11px`) — won't adapt to user preferences

### Text Overflow

Tab labels, project names, terminal labels, and git file paths lack consistent `text-overflow: ellipsis` handling. Very long names will break layout.

### Z-Index Layering

Z-index values (10, 50, 100) are scattered without a documented scale. Context menu (100) could conflict with dropdown menus (50) depending on DOM nesting.

---

## 8. Build & Distribution

### App Metadata

- `index.html` has no meta description, theme-color, or favicon link
- App icon sizes should be verified for all required macOS resolutions
- No about dialog or way to check app version

### No Environment-Aware Logging

All `console.log`/`console.error` calls run in production builds. Should gate behind `import.meta.env.DEV` or use the Tauri log plugin consistently.

---

## Priority Matrix

### Fix Before Sharing (High Impact, Low Effort)

1. Replace `window.alert()` with styled error display
2. Remove or gate `console.log` statements
3. Fix the notification TODO (restore focus guard)
4. Add loading/disabled state to the session launch button
5. Add `text-overflow: ellipsis` to tab labels and sidebar items

### Fix Soon (High Impact, Medium Effort)

6. Surface errors from async operations in the UI (git, PTY spawn, settings)
7. Add ARIA labels to all interactive elements
8. Add a "Copied!" toast for clipboard operations
9. Enable basic CSP in `tauri.conf.json`
10. Show app version somewhere accessible (settings panel or title bar)

### Polish (Medium Impact)

11. Add window position/size persistence
12. Refactor `AppShell.tsx` — extract panel logic, terminal management
13. Consolidate repetitive store patterns in `useUIStore.ts`
14. Add keyboard navigation to context menus and dropdowns
15. Improve color contrast for status indicators
