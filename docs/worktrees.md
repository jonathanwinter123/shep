# Worktrees in Shep

Git worktrees let you have multiple branches checked out simultaneously in separate directories. This is especially useful for running AI assistants on isolated branches without disrupting your current work.

## How it works

Shep does not create worktrees for you right now. Instead:

1. You create a worktree with normal git commands
2. You add either the main repo or a specific worktree to Shep
3. Shep automatically imports the related repo/worktree entries Git already knows about
4. Shep treats each worktree as its own project entry
5. AI assistants, terminals, commands, and git actions run in the selected directory

The worktree is completely isolated from your main checkout. Commits in the worktree go to the worktree's branch, not your current branch.

## Creating a worktree

Create worktrees with git in your terminal, for example:

```bash
git worktree add ../my-repo-feature feature/my-change
```

You can use any naming and storage convention you want. Shep does not require a special folder layout.

## Adding a worktree to Shep

Use **Add Project** and select either:

1. The main repo directory to add the repo and its existing worktrees
2. A specific worktree directory to add that worktree and its associated main repo

## Working with worktrees

### Sidebar

Once added, a worktree appears as its own project row in the sidebar. Shep labels it with the parent repo name so it is easy to distinguish from the main checkout.

### Git panel

Click **Git** in the sidebar to open the git panel for the active repo or worktree:

- **Main repo**: full branch dropdown for switching or creating branches
- **Worktree**: branch name shown read-only, plus staging, commit, and push for that worktree checkout

### Stage, commit, push

The git panel provides:

- **File list**: shows staged files and unstaged changes
- **Stage/unstage**: per-file (+/-) buttons or bulk stage/unstage all via the section header buttons
- **Commit**: message input at the bottom of the file list, commit button shows staged count. Use Cmd+Enter (Mac) or Ctrl+Enter to commit.
- **Push**: appears in the header when you have unpushed commits

### Typical worktree workflow

1. Create a worktree with git
2. Add the repo or worktree in Shep
3. Launch an assistant or terminal in the worktree
4. Stage and commit
5. Push the branch
6. Create a PR on GitHub/GitLab (via `gh pr create`, the web UI, or ask the AI assistant)
7. Merge the PR on the remote
8. Clean up the worktree when done

## Notes

- Shep does not currently create, configure, or remove existing worktrees for you outside Git.
- Shep does not require special `workspace.yml` settings for worktrees.
- If a repo is a worktree, Shep detects that automatically and prevents branch switching in the Git panel.

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
```

The `.shep` directory is automatically gitignored.
