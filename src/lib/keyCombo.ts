/**
 * Normalized key combo format: modifiers in fixed order + key.
 * Example: "Cmd+Shift+G", "Ctrl+Alt+N", "Shift+Enter"
 *
 * Modifier order: Ctrl -> Option -> Shift -> Cmd
 */

/** Convert a KeyboardEvent to a normalized combo string. Returns null for modifier-only presses. */
export function eventToCombo(ev: KeyboardEvent): string | null {
  const key = normalizeKey(ev.key, ev.code);
  if (!key) return null;

  const parts: string[] = [];
  if (ev.ctrlKey) parts.push("Ctrl");
  if (ev.altKey) parts.push("Option");
  if (ev.shiftKey) parts.push("Shift");
  if (ev.metaKey) parts.push("Cmd");
  parts.push(key);
  return parts.join("+");
}

/** Normalize a combo string to canonical modifier order. */
export function normalizeCombo(combo: string): string {
  const parts = combo.split("+").map((p) => p.trim());
  const key = parts.pop()!;
  const mods = new Set(parts.map(normalizeMod));

  const ordered: string[] = [];
  if (mods.has("Ctrl")) ordered.push("Ctrl");
  if (mods.has("Option")) ordered.push("Option");
  if (mods.has("Shift")) ordered.push("Shift");
  if (mods.has("Cmd")) ordered.push("Cmd");
  ordered.push(key);
  return ordered.join("+");
}

/** Check if a KeyboardEvent matches a combo string. */
export function eventMatchesCombo(
  ev: KeyboardEvent,
  combo: string,
): boolean {
  return eventToCombo(ev) === normalizeCombo(combo);
}

/** Format a combo string for display (e.g., replace "Cmd" with the platform symbol). */
export function formatComboForDisplay(combo: string): string[] {
  return combo.split("+").map((part) => {
    switch (part) {
      case "Cmd":
        return "\u2318";
      case "Ctrl":
        return "\u2303";
      case "Option":
        return "\u2325";
      case "Shift":
        return "\u21E7";
      default:
        return part;
    }
  });
}

function normalizeMod(mod: string): string {
  switch (mod.toLowerCase()) {
    case "cmd":
    case "meta":
    case "command":
    case "\u2318":
      return "Cmd";
    case "ctrl":
    case "control":
    case "\u2303":
      return "Ctrl";
    case "alt":
    case "option":
    case "\u2325":
      return "Option";
    case "shift":
    case "\u21e7":
      return "Shift";
    default:
      return mod;
  }
}

function normalizeKey(key: string, code: string): string | null {
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return null;

  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";

  switch (key) {
    case "Backspace":
      return "Delete";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case " ":
      return "Space";
    case ",":
      return ",";
    default:
      break;
  }

  if (key.length === 1) return key.toUpperCase();

  return key;
}
