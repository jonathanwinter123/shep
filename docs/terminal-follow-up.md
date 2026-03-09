# Terminal Follow-Up

This note captures the current terminal state in Shep and the highest-value next steps if terminal rendering work needs to resume later.

## Current state

The terminal is in much better shape than the initial baseline.

Notable improvements already made:

- PTY output decoding now preserves split UTF-8 sequences instead of corrupting them into replacement glyphs.
- Initial PTY sizing now uses xterm's fit logic instead of cached custom cell math.
- Terminal attach order now fits and resizes before buffered output is flushed.
- `Unicode11Addon` is enabled.
- WebGL renderer is attempted first, with Canvas fallback.
- `reflowCursorLine` is enabled.
- Terminal font settings were tuned toward a more native mac feel.

Result:

- Gemini, Claude Code, and Codex all render materially better than before.
- The main remaining issue is not obvious corruption; it is a softer "this still feels a little off/squished" problem.

## Relevant files

- Frontend terminal view: `src/components/terminal/TerminalView.tsx`
- PTY frontend hook/buffering: `src/hooks/usePty.ts`
- Terminal metrics config: `src/lib/terminalConfig.ts`
- Offscreen size probe: `src/lib/terminalMeasure.ts`
- Rust PTY session: `src-tauri/src/pty/session.rs`

## Current open questions

These are the main things still worth checking.

1. Terminal capability environment

- The backend currently sets `TERM=xterm-256color`.
- It likely still needs a better env profile for rich terminal UIs:
  - `COLORTERM=truecolor`
  - possibly other app-friendly flags depending on Gemini / Claude Code / Codex behavior
- If rich CLIs still behave differently inside Shep vs a native terminal, this is a strong suspect.

2. Font/render feel

- The remaining issue looks more visual than structural.
- The screen can still feel cramped or "squished" even when layout is technically correct.
- This is likely a combination of:
  - font choice
  - font size
  - line height
  - xterm renderer differences vs native terminals

3. Renderer compatibility

- `@xterm/addon-canvas` installed with a peer warning against `@xterm/xterm@6`.
- The build passes, but this should still be treated as a runtime compatibility risk until exercised more heavily.

## Best reference

The best real-world reference for this stack is Tabby.

- Repo: <https://github.com/Eugeny/tabby>
- Main frontend reference: `tabby-terminal/src/frontends/xtermFrontend.ts`

Why it matters:

- It uses the same general xterm frontend model.
- It explicitly uses the same kinds of building blocks we care about:
  - `FitAddon`
  - `Unicode11Addon`
  - WebGL / Canvas renderer selection
  - resize lifecycle management
  - terminal metric tuning

Secondary references:

- xterm.js: <https://github.com/xtermjs/xterm.js>
- xterm docs: <https://xtermjs.org/>
- VS Code xterm integration notes: <https://github.com/microsoft/vscode/wiki/Working-with-xterm.js>

## Suggested next pass

If this work is resumed later, do these in order:

1. Verify runtime behavior in Shep against a native terminal

- Launch Gemini, Claude Code, and Codex in Shep.
- Launch the same tools in Ghostty or Terminal.app with the same repo.
- Compare:
  - startup banner width
  - prompt wrapping
  - separators / box drawing
  - cursor placement
  - text density / legibility

2. Improve PTY env parity

- Add `COLORTERM=truecolor`.
- Review whether any of the assistant CLIs react to other terminal-related env vars.
- Re-test before making any more rendering tweaks.

3. Re-check font tuning after env parity

- Try one font at a time instead of a long fallback list.
- Good mac-safe candidates:
  - `Menlo`
  - `SF Mono`
- Keep the tuning surface small:
  - font size
  - line height

4. Revisit renderer fallback only if needed

- If WebGL shows odd artifacts, compare WebGL vs Canvas explicitly.
- If Canvas fallback is unstable because of the peer-version warning, pin versions more carefully.

## Practical debugging checklist

Use this list before making new code changes:

- Does the issue reproduce in all three assistants, or mainly one?
- Does it reproduce only on first paint, or after interaction too?
- Does resizing the window "fix" it?
- Does switching between tabs make it better or worse?
- Does the same app render correctly in Ghostty / Terminal.app?
- Does changing only the font make the problem disappear?

## Useful commands

Frontend build:

```bash
./node_modules/.bin/tsc && ./node_modules/.bin/vite build
```

Rust PTY tests:

```bash
cargo test pty::session
```

Ghostty defaults on this machine:

```bash
ghostty +show-config --default --changes-only=false | rg "font-size|font-family|adjust-cell-height"
```

Check installed monospace fonts on macOS:

```bash
find /System/Library/Fonts /Library/Fonts "$HOME/Library/Fonts" -maxdepth 2 | rg -i "menlo|sf.*mono|monaco|courier|iosevka"
```

## Recommendation

Do not resume by tweaking layout math again first.

The next highest-value step is terminal env parity and runtime comparison against a native terminal. The remaining issue no longer looks like a basic xterm sizing bug.
