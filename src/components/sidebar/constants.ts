import type { CodingAssistant } from "../../lib/types";

export const CODING_ASSISTANTS: CodingAssistant[] = [
  { id: "claude", name: "Claude Code CLI", command: "claude", yoloFlag: "--dangerously-skip-permissions" },
  { id: "codex", name: "Codex CLI", command: "codex", yoloFlag: "--full-auto" },
  { id: "gemini", name: "Gemini CLI", command: "gemini", yoloFlag: null },
];
