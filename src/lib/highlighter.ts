import { createHighlighter, type Highlighter } from "shiki";

const PRELOAD_LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "rust",
  "html",
  "css",
  "toml",
  "yaml",
  "markdown",
  "shellscript",
  "ruby",
  "erb",
  "python",
  "go",
  "sql",
  "xml",
  "docker",
  "diff",
  "make",
  "text",
] as const;

const THEME = "dracula";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...PRELOAD_LANGS],
    });
  }
  return highlighterPromise;
}

/**
 * Line-number transformer: adds `data-line` attribute to each line span
 * so CSS can render line numbers via ::before.
 */
const lineNumberTransformer = {
  line(node: { properties: Record<string, unknown> }, line: number) {
    node.properties["data-line"] = line;
  },
};

/**
 * Highlight code and return HTML string.
 * Loads the language on demand if not already loaded.
 * Returns null if highlighting fails.
 */
export async function highlight(
  code: string,
  lang: string,
): Promise<string | null> {
  try {
    const hl = await getHighlighter();
    const loaded = hl.getLoadedLanguages();
    if (!loaded.includes(lang)) {
      await hl.loadLanguage(lang as Parameters<typeof hl.loadLanguage>[0]);
    }
    return hl.codeToHtml(code, {
      lang,
      theme: THEME,
      transformers: [lineNumberTransformer],
    });
  } catch (err) {
    if (import.meta.env.DEV) console.error("Shiki highlight failed:", err);
    return null;
  }
}

/**
 * Return the list of all languages the highlighter knows about.
 * Falls back to empty array if the highlighter hasn't loaded yet.
 */
export async function getAvailableLanguages(): Promise<string[]> {
  try {
    const hl = await getHighlighter();
    // getLoadedLanguages() includes aliases (ts, js, sh, etc.) — filter to
    // canonical names only so the dropdown isn't cluttered with duplicates.
    const loaded = new Set(hl.getLoadedLanguages());
    return [...PRELOAD_LANGS].filter((l) => loaded.has(l)).sort();
  } catch {
    return [];
  }
}
