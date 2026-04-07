export const TERMINAL_FONT_SIZE = 14;
export const TERMINAL_FONT_FAMILY =
  "'MesloLGS NF', 'Menlo', 'Monaco', 'Courier New', monospace";
export const TERMINAL_LINE_HEIGHT = 1;

export const FONT_OPTIONS = [
  { id: "'MesloLGS NF', 'Menlo', 'Monaco', 'Courier New', monospace", label: "MesloLGS Nerd Font" },
  { id: "'Menlo', 'Monaco', 'Courier New', monospace", label: "Menlo" },
  { id: "'Monaco', 'Menlo', 'Courier New', monospace", label: "Monaco" },
  { id: "'Courier New', monospace", label: "Courier New" },
] as const;

export const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 18] as const;

const MONOSPACE_FAMILIES = new Set(["monospace", "ui-monospace"]);

function unquoteFontFamily(family: string): string {
  const trimmed = family.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function hasMonospaceFallback(fontFamily: string): boolean {
  return fontFamily
    .split(",")
    .some((family) => MONOSPACE_FAMILIES.has(unquoteFontFamily(family).toLowerCase()));
}

function quoteFontFamily(family: string): string {
  const trimmed = family.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed;
  }
  if (MONOSPACE_FAMILIES.has(trimmed.toLowerCase())) {
    return trimmed;
  }
  return `'${trimmed.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function normalizeTerminalFontFamily(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (!trimmed) return TERMINAL_FONT_FAMILY;
  if (FONT_OPTIONS.some((font) => font.id === trimmed)) return trimmed;

  const familyStack = trimmed.includes(",") ? trimmed : quoteFontFamily(trimmed);
  return hasMonospaceFallback(familyStack) ? familyStack : `${familyStack}, monospace`;
}

export function displayTerminalFontFamily(fontFamily: string): string {
  if (FONT_OPTIONS.some((font) => font.id === fontFamily)) return "";

  const families = fontFamily.split(",").map((family) => family.trim()).filter(Boolean);
  if (families.length === 2 && hasMonospaceFallback(families[1])) {
    return unquoteFontFamily(families[0]);
  }
  return fontFamily;
}
