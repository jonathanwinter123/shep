// ── Config types (match Rust structs) ────────────────────────────────

export interface RepoInfo {
  path: string;
  name: string;
  valid: boolean;
}

export interface CommandConfig {
  name: string;
  command: string;
  autostart: boolean;
  env: Record<string, string>;
}

export interface WorkspaceConfig {
  name: string;
  commands: CommandConfig[];
  assistants: AssistantConfig[];
}

// ── Runtime state types ─────────────────────────────────────────────

export type CommandStatus = "stopped" | "running" | "crashed";

export interface CommandState {
  name: string;
  command: string;
  status: CommandStatus;
  ptyId: number | null;
  autostart: boolean;
  env: Record<string, string>;
}

export type SessionMode = "standard" | "worktree" | "yolo";

export interface TerminalTab {
  id: string;
  label: string;
  ptyId: number;
  repoPath: string;
  commandName: string | null; // null = blank shell or assistant
  assistantId: string | null; // null = not an assistant tab
  sessionMode: SessionMode | null; // null = not an assistant tab
  worktreePath: string | null; // set for YOLO worktree sessions
  branch: string | null; // git branch at launch (refreshable)
}

// ── Coding assistants ───────────────────────────────────────────────

export interface CodingAssistant {
  id: string;
  name: string;
  command: string;
  yoloFlag: string | null;
}

export interface AssistantConfig {
  id: string;
  name: string;
  command: string;
  yoloFlag: string | null;
}

// ── PTY output ──────────────────────────────────────────────────────

export type PtyOutput =
  | { event: "data"; data: string }
  | { event: "exit"; data: { code: number } };
