Below is a clean project spec you could drop directly into a repo (for example TERMINAL_WORKSPACE_APP.md).
I wrote it as a practical builder-oriented design doc, not a marketing doc.

It focuses on your real goal:

Replace 10–20 random terminal tabs with organized project workspaces that run coding agents and dev tasks.

Council mode is included but clearly secondary.

⸻

Terminal Workspace Manager

A lightweight desktop app for organizing CLI coding tools and development tasks

Overview

Modern development increasingly relies on CLI-based AI tools and dev processes:
	•	Claude Code
	•	Codex CLI
	•	Gemini CLI
	•	OpenCode
	•	dev servers (npm run dev)
	•	background workers
	•	database containers
	•	build tasks

Developers often end up with dozens of terminal tabs open, typically across tools like:
	•	Ghostty
	•	WezTerm
	•	iTerm
	•	Alacritty

The problem is not the terminal itself — it is lack of organization.

Typical developer state:

ghostty tab 1 → claude code
ghostty tab 2 → codex
ghostty tab 3 → gemini
ghostty tab 4 → npm run dev
ghostty tab 5 → docker compose
ghostty tab 6 → worker
ghostty tab 7 → build logs
ghostty tab 8 → random shell

This project solves that problem.

Instead of managing dozens of tabs manually, the app provides project workspaces with organized tasks and embedded terminals.

⸻

Core Goals

The primary goal:

Organize CLI coding tools and dev tasks by project in one place.

The application should allow developers to:
	•	group tasks by project
	•	launch multiple CLI tools quickly
	•	run startup tasks
	•	restart crashed processes
	•	maintain a clean terminal layout
	•	avoid dozens of unmanaged terminal tabs

The application does not aim to replace the system shell, but instead provides:

a workspace/task manager with embedded terminals.

⸻

Primary Features

Project Workspaces

Projects represent a development environment.

Example:

Projects
  ├── tableprompt
  ├── assessorsearch
  ├── ai-playground

Each project contains:
	•	task definitions
	•	terminal layout
	•	startup tasks
	•	environment variables
	•	working directory

Example project view:

Project: assessorsearch

Tasks
  claude
  codex
  gemini
  dev-server
  worker
  db

Opening a project loads the entire workspace.

⸻

Task Management

Tasks represent commands that run in terminals.

Example tasks:

claude
codex
gemini
opencode
npm run dev
make run
docker compose up
python worker.py

Each task runs in its own terminal pane.

Example task configuration

tasks:

  claude:
    command: claude
    cwd: .

  codex:
    command: codex

  gemini:
    command: gemini

  dev:
    command: npm run dev
    autostart: true

  worker:
    command: python worker.py
    autostart: true

Capabilities:
	•	start
	•	stop
	•	restart
	•	show logs
	•	open terminal
	•	run once or persistent

⸻

Startup Tasks

Some tasks should automatically run when the project opens.

Example:

dev server
worker
database

Example config:

dev:
  command: npm run dev
  autostart: true

worker:
  command: python worker.py
  autostart: true

When the project opens:

✓ dev server started
✓ worker started
✓ database started


⸻

Embedded Terminals

Each task runs inside an embedded terminal.

Terminals behave like normal shells:
	•	interactive input
	•	scrollback
	•	copy/paste
	•	colors
	•	keyboard shortcuts

The user can still run commands manually.

Example terminal:

> claude

Or:

> git status

Or:

> make run

This means the tool works even when no task configuration exists.

⸻

Layout System

Projects should support saved layouts.

Example layout:

------------------------------------
| Claude | Codex | Gemini          |
------------------------------------
| Dev Server Logs                  |
------------------------------------
| Worker Logs                      |
------------------------------------

Users can:
	•	resize panes
	•	split terminals
	•	save layouts
	•	restore layouts

⸻

Quick Task Launcher

Users should be able to launch tasks quickly.

Example keyboard shortcut:

Cmd + K

Command palette:

Run Task:
  claude
  codex
  gemini
  npm run dev
  worker

This acts like a project-specific launcher.

⸻

Status Indicators

Each task should have a visible state:

● running
○ stopped
⚠ crashed
↻ restarting

Example sidebar:

Tasks
● claude
● codex
● gemini
● dev server
⚠ worker

Clicking a task focuses its terminal.

⸻

Blank Terminal Mode

The user should always be able to open a blank shell.

Example:

New Terminal

Runs:

/bin/zsh

This ensures the tool works even when no configuration exists.

⸻

Secondary Feature: Council Mode

Council mode allows a single prompt to be sent to multiple coding agents.

Example participants:

Claude Code
Codex CLI
Gemini CLI

User workflow:
	1.	enter prompt
	2.	send to multiple agents
	3.	collect responses
	4.	compare results

Example:

Prompt:
"Write an implementation plan for this feature."

Outputs:

Claude response
Codex response
Gemini response

This allows:
	•	side-by-side comparison
	•	best-answer selection
	•	consensus generation

Council mode is not required for the core product, but becomes easy to add once agent tasks are integrated.

⸻

Architecture

The system consists of three layers.

UI Layer
Terminal Renderer
PTY Process Manager


⸻

UI Layer

Responsibilities:
	•	project sidebar
	•	task management
	•	layout system
	•	status indicators
	•	command palette

Recommended stack:

React
Tailwind


⸻

Terminal Renderer

Responsible for displaying terminal output.

Recommended library:

xterm.js

Capabilities:
	•	ANSI rendering
	•	cursor control
	•	scrollback
	•	keyboard input
	•	resizing

⸻

PTY Process Manager

Handles running shell processes.

Responsibilities:
	•	spawn tasks
	•	connect stdin/stdout
	•	restart on failure
	•	detect exit codes
	•	manage environment variables

Recommended backend:

Rust
portable-pty
tokio


⸻

Desktop App Framework

Recommended framework:

Tauri

Advantages:
	•	small binary
	•	Rust backend
	•	native performance
	•	good filesystem access
	•	lightweight compared to Electron

⸻

Example File Structure

app/

  src/
    ui/
      sidebar
      task-list
      terminal-pane
      workspace

    backend/
      task_manager
      pty_manager
      workspace_manager

  projects/

    assessorsearch/
      workspace.yml

    tableprompt/
      workspace.yml


⸻

Workspace Configuration

Example file:

workspace.yml

Example content:

project: assessorsearch

cwd: /Users/doug/code/assessorsearch

tasks:

  claude:
    command: claude

  codex:
    command: codex

  gemini:
    command: gemini

  dev:
    command: npm run dev
    autostart: true

  worker:
    command: python worker.py
    autostart: true


⸻

Future Features

Possible extensions:

session restore

Restore terminals when reopening project.

logs viewer

View logs separate from terminal.

crash restart policies

restart: on-failure
restart: always

agent adapters

Better integrations with:
	•	Claude Code
	•	Codex
	•	Gemini
	•	OpenCode

council workflows

Prompt orchestration across agents.

⸻

Development Phases

Phase 1 — MVP

Core functionality:
	•	projects
	•	tasks
	•	embedded terminals
	•	startup tasks
	•	simple layout
	•	status indicators

Goal:

Replace 10+ terminal tabs.

⸻

Phase 2 — UX Improvements

Add:
	•	command palette
	•	layout persistence
	•	crash detection
	•	restart controls

⸻

Phase 3 — Agent Features

Add:
	•	council mode
	•	prompt routing
	•	structured agent sessions

⸻

Summary

This project is essentially:

tmux
+ project workspaces
+ AI coding tool launcher
+ modern UI

The application focuses on organization, not replacing the shell.

Primary benefits:
	•	fewer unmanaged terminal tabs
	•	consistent project environments
	•	quick access to coding agents
	•	automated startup tasks
	•	clean workspace layouts

⸻

If you want, I can also write a second markdown doc that goes much deeper into:

the actual internal components needed to build this (roughly 10 core modules) — which is extremely helpful if you ever decide to implement it.