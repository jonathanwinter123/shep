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

export interface TerminalTab {
  id: string;
  label: string;
  ptyId: number;
  commandName: string | null; // null = blank shell or assistant
  assistantId: string | null; // null = not an assistant tab
}

// ── Coding assistants ───────────────────────────────────────────────

export interface CodingAssistant {
  id: string;
  name: string;
  command: string;
}

// ── PTY output ──────────────────────────────────────────────────────

export type PtyOutput =
  | { event: "data"; data: string }
  | { event: "exit"; data: { code: number } };
