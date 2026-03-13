import type { KeybindingSettings } from "./types";

export interface KeybindingPreset {
  id: keyof KeybindingSettings;
  label: string;
  description: string;
  /** Bytes to write to the PTY when the combo fires */
  sequence: string;
  /** Return true if this keyboard event matches the key combo (regardless of keydown/keyup) */
  match: (ev: KeyboardEvent) => boolean;
}

export const KEYBINDING_PRESETS: KeybindingPreset[] = [
  {
    id: "shiftEnterNewline",
    label: "Shift + Enter → newline",
    description: "Send a newline instead of submitting. Useful for multi-line input in Claude Code, Codex, etc.",
    sequence: "\n",
    match: (ev) =>
      ev.key === "Enter" && ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey,
  },
  {
    id: "optionDeleteWord",
    label: "Option + Backspace → delete word",
    description: "Delete the previous word, matching macOS text editing conventions.",
    sequence: "\x17", // Ctrl+W
    match: (ev) =>
      ev.key === "Backspace" && ev.altKey && !ev.ctrlKey && !ev.metaKey,
  },
  {
    id: "cmdKClear",
    label: "Cmd + K → clear terminal",
    description: "Clear the terminal screen, matching iTerm and Terminal.app behavior.",
    sequence: "\x0c", // form feed
    match: (ev) =>
      ev.key === "k" && ev.metaKey && !ev.ctrlKey && !ev.altKey,
  },
];
