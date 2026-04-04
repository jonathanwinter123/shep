# Worktrees in Shep

Git worktrees let you have multiple branches checked out simultaneously in separate directories. This is especially useful for running AI assistants on isolated branches without disrupting your current work.

## How it works

When you create a worktree in Shep:

1. A new branch is created (e.g. `wt/20260404-13aj`)
2. A separate working directory is set up at `{repo-parent}/.shep-worktrees/{repo-name}/{branch-slug}`
3. Configured files are copied or symlinked into the worktree
4. The worktree appears as a workspace in the sidebar
5. AI assistants and terminals launched there run in the worktree directory

The worktree is completely isolated from your main checkout. Commits in the worktree go to the worktree's branch, not your current branch.

## Creating a worktree

1. Click **AI Assistants** in the sidebar to open the session launcher
2. Select an assistant
3. Choose **Worktree** (or **YOLO**) mode
4. Optionally edit the branch name
5. Click **Start Session**

### Branch naming

- **Worktree mode**: auto-generates `wt/YYYYMMDD-{id}` (e.g. `wt/20260404-13aj`)
- **YOLO mode**: auto-generates `yolo/YYYYMMDD-{id}`
- You can replace the auto-generated name with anything (e.g. `wt/add-auth`)

### Standard mode

Standard mode launches on your current branch. Optionally check **Create new branch** to branch first.

## Working with worktrees

### Sidebar

When worktrees exist, the sidebar shows workspace rows under your project:

- Your main branch (e.g. `main`) with a branch icon
- Each worktree with a folder-tree icon

Click a workspace row to switch to it. The active workspace expands to show its AI Assistants, Terminals, Commands, and Git sections. Only one workspace is expanded at a time.

### Git panel

Click **Git** in the sidebar to open the git panel. It automatically scopes to whichever workspace is active:

- **Main workspace**: full branch dropdown (switch, create branches), staging, commit, push
- **Worktree workspace**: branch name shown read-only (can't switch branches in a worktree), staging, commit, push

### Stage, commit, push

The git panel provides:

- **File list**: shows staged files and unstaged changes
- **Stage/unstage**: per-file (+/-) buttons or bulk stage/unstage all via the section header buttons
- **Commit**: message input at the bottom of the file list, commit button shows staged count. Use Cmd+Enter (Mac) or Ctrl+Enter to commit.
- **Push**: appears in the header when you have unpushed commits

### Typical worktree workflow

1. Create a worktree from the session launcher
2. The AI assistant works in the worktree
3. Review changes in the git panel
4. Stage and commit
5. Push the branch
6. Create a PR on GitHub/GitLab (via `gh pr create`, the web UI, or ask the AI assistant)
7. Merge the PR on the remote
8. Clean up the worktree when done

## Worktree configuration

Worktree settings are defined per-project in `{repo}/.shep/workspace.yml` under the `worktree` key.

### Example

```yaml
name: my-project
worktree:
  copy:
    - .env
    - .env.local
    - config/local.json
  symlink:
    - node_modules
    - .venv
    - target
  post_create:
    - pnpm install
```

### Fields

#### `copy` (list of paths)

Files or directories to **copy** from the main repo into the new worktree. Use this for files that may differ between checkouts:

- `.env` files (environment variables, secrets)
- Local config files not tracked by git
- Any file the worktree needs but isn't in the repo

#### `symlink` (list of paths)

Files or directories to **symlink** from the main repo into the worktree. The worktree shares the original files — changes in one are reflected in the other. Use this for large directories you don't want duplicated:

- `node_modules` — avoids running `npm install` in every worktree
- `.venv` — shares Python virtual environments
- `target` — shares Rust build artifacts
- Any large dependency or cache directory

#### `post_create` (list of commands)

Shell commands to run after the worktree is created. These run in the worktree directory. Use this for setup tasks that can't be handled by copy/symlink:

- `pnpm install` — if you can't symlink node_modules (e.g. native modules)
- `cp .env.example .env` — create env files from templates
- Any project-specific initialization

Note: AI assistants will typically handle dependency installation themselves, so `post_create` is often unnecessary if you're using symlinks for dependency directories.

### Defaults

All fields default to empty lists. If no worktree config is defined, worktrees are created as bare checkouts with no additional files.

## Worktree storage

Worktrees are stored at:

```
{repo-parent}/.shep-worktrees/{repo-name}/{branch-slug}
```

For example, if your repo is at `~/dev/my-app` and the branch is `wt/20260404-13aj`:

```
~/dev/.shep-worktrees/my-app/wt-20260404-13aj
```

Each project's worktrees are grouped in a subfolder named after the repo.

## Full configuration reference

Shep uses two configuration files:

### Global config: `~/.shep/config.yml`

```yaml
version: 1
repos:
  - path: /Users/you/dev/project-a
  - path: /Users/you/dev/project-b

editor:
  preferredEditor: code    # or: zed, sublime, cursor

terminal:
  cursorStyle: block       # block, underline, bar
  cursorBlink: true
  scrollback: 10000
  fontFamily: "'MesloLGS NF', 'Menlo', monospace"
  fontSize: 14

keybindings:
  shiftEnterNewline: true
  optionDeleteWord: true
  cmdKClear: true

usage:
  showClaude: true
  showCodex: true
  showGemini: true
```

### Per-project config: `{repo}/.shep/workspace.yml`

```yaml
name: my-project

commands:
  - name: Dev Server
    command: npm run dev
    autostart: false
    env:
      NODE_ENV: development
    cwd: null

assistants: []

worktree:
  copy:
    - .env
  symlink:
    - node_modules
  post_create: []
```

The `.shep` directory is automatically gitignored.
