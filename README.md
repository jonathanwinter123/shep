# Shep

**A terminal workspace for developers who run too many things at once.**

Shep is a native macOS app that organizes your terminal sessions into project workspaces. Dev servers, test watchers, AI coding agents — instead of juggling 15 terminal tabs, Shep keeps everything in one place with autostart, status indicators, and one-click agent launches.

<!-- TODO: Add screenshot -->
<!-- ![Shep screenshot](docs/screenshot.png) -->

## Download

### GitHub Releases

Grab the latest `.dmg` from the [Releases](https://github.com/stumptowndoug/shep/releases) page. Open it, drag Shep to Applications, done.

### Build from Source

If you'd rather build it yourself:

```bash
git clone https://github.com/stumptowndoug/shep.git
cd shep
pnpm install
pnpm tauri build
```

The built app lands in `src-tauri/target/release/bundle/macos/shep.app` and a ready-to-share DMG in `src-tauri/target/release/bundle/dmg/`.

**Requirements for building:**
- macOS with Xcode CLI tools
- Node.js 20+
- Rust (via [rustup](https://rustup.rs))
- [pnpm](https://pnpm.io)

## Features

- **Project workspaces** — register repos and define named tasks (dev server, tests, linters, etc.) that live together
- **Autostart** — mark tasks to launch automatically when you open a project
- **Status indicators** — see at a glance what's running, stopped, or crashed
- **Tab management** — each task gets its own terminal tab, plus blank shells on demand
- **AI agent launcher** — built-in support for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex](https://github.com/openai/codex), and [Gemini CLI](https://github.com/google-gemini/gemini-cli) with standard, worktree, and autonomous modes
- **Git worktree isolation** — spin up AI sessions in isolated worktrees so agents can go wild without touching your working branch
- **Glass terminal rendering** — translucent terminal backgrounds with full 256-color and Unicode support

## Getting Started

### 1. Add a project

Click **+** next to the project dropdown. Point it at a repo directory.

### 2. Configure tasks

Shep creates a config at `~/.shep/projects/<project-name>/workspace.yml`. Edit it to define your tasks:

```yaml
name: my-app
cwd: /Users/you/projects/my-app
tasks:
  - name: dev server
    command: npm run dev
    autostart: true
  - name: tests
    command: npm test -- --watch
    autostart: false
  - name: claude
    command: claude
    autostart: true
```

### 3. Work

Select your project from the sidebar. Autostart tasks spin up immediately. Click any task to jump to its terminal. Hover for start/stop/restart controls.

**Shortcuts:**
- **+** in the tab bar opens a blank shell
- **x** on a tab kills the process and closes it
- Switching projects tears down old terminals and starts fresh

## AI Agents

Shep has first-class support for CLI-based coding agents. The sidebar shows a dedicated Assistants section with three session modes:

| Mode | What it does |
|------|-------------|
| **Standard** | Runs the agent in your current repo directory |
| **Worktree** | Creates an isolated git worktree so the agent works on a separate branch |
| **YOLO** | Worktree + the agent's autonomous flag (e.g. `--dangerously-skip-permissions` for Claude) |

Currently supports **Claude Code**, **Codex CLI**, and **Gemini CLI**. Adding more is just a config change.

## Development

```bash
pnpm install       # first time only
pnpm tauri dev     # launches with hot reload
```

Frontend changes appear instantly. Rust changes trigger a recompile. The dev server runs at `localhost:5173`.

### Project Structure

```
src/                    React frontend (TypeScript + Tailwind CSS)
  components/           UI — layout, sidebar, terminal, settings
  stores/               Zustand state management
  hooks/                PTY lifecycle, theme application
  lib/                  Types, Tauri IPC wrappers, config

src-tauri/              Rust backend (Tauri v2)
  src/commands.rs       IPC command handlers
  src/pty/              PTY process management (portable-pty)
  src/workspace/        Config loading and workspace management
  src/git.rs            Git operations and worktree support
```

### Tech Stack

**Frontend:** React 19 , TypeScript, Zustand, Tailwind CSS, xterm.js, Vite
**Backend:** Rust, Tauri 2, portable-pty
**Build:** pnpm, Vite, Tauri CLI

## License

MIT
