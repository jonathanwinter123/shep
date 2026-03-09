# Shep — Terminal Workspace Manager

Shep organizes your terminal sessions into project workspaces. Each project contains named tasks (dev servers, watchers, AI tools) that run in embedded terminals with autostart, status indicators, and tab management.

## Quick Start

```bash
# Install dependencies (first time only)
pnpm install

# Run in development mode (recommended while building)
pnpm tauri dev
```

This opens the Shep window with hot reload — frontend changes appear instantly, Rust changes trigger a recompile.

## Usage

### 1. Create a project

Click the **+** button next to the project dropdown in the sidebar. Enter a name and the working directory path (e.g., `/Users/you/projects/my-app`).

### 2. Add tasks

Edit the workspace config file directly:

```bash
# Open the config for your project
open ~/.shep/projects/<project-name>/workspace.yml
```

Example `workspace.yml`:

```yaml
name: my-app
cwd: /Users/you/projects/my-app
tasks:
  - name: dev server
    command: npm run dev
    autostart: true
    env: {}
  - name: claude
    command: claude
    autostart: true
    env: {}
  - name: tests
    command: npm test -- --watch
    autostart: false
    env: {}
```

### 3. Open the project

Select your project from the dropdown. Tasks marked `autostart: true` launch automatically with green status dots. Click any task name to open its terminal tab.

### Controls

- **Start/Stop/Restart** — hover over a task in the sidebar to reveal controls
- **New Terminal** — click **+** in the tab bar for a blank shell
- **Close tab** — click **×** on a tab (kills the PTY)
- **Switch projects** — select from dropdown (cleans up old terminals)

## Project Structure

```
src/                    React frontend (TypeScript + Tailwind)
src-tauri/              Rust backend (Tauri v2 + portable-pty)
~/.shep/projects/       Workspace configs (YAML)
```

## Building for Distribution

```bash
pnpm tauri build
```

Output:
- `src-tauri/target/release/bundle/macos/shep.app`
- `src-tauri/target/release/bundle/dmg/shep_0.1.0_aarch64.dmg`

To install: open the `.dmg` and drag Shep to Applications, or copy the `.app` directly.

## Requirements

- macOS with Xcode CLI tools
- Node.js 20+
- Rust (installed via rustup)
- pnpm
