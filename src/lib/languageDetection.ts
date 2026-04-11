const EXTENSION_MAP: Record<string, string> = {
  // Tier 1
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  rs: "rust",
  html: "html",
  css: "css",
  toml: "toml",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  rb: "ruby",
  erb: "erb",
  // Tier 2
  py: "python",
  go: "go",
  sql: "sql",
  xml: "xml",
  diff: "diff",
  patch: "diff",
};

const FILENAME_MAP: Record<string, string> = {
  Dockerfile: "docker",
  Makefile: "makefile",
  Gemfile: "ruby",
  Rakefile: "ruby",
};

/**
 * Detect Shiki language ID from a file path.
 * Returns null if the file type is not recognized.
 */
export function getLanguageFromPath(filePath: string): string | null {
  const fileName = filePath.split("/").pop() ?? "";
  if (FILENAME_MAP[fileName]) return FILENAME_MAP[fileName];

  const ext = fileName.includes(".") ? fileName.split(".").pop()! : "";
  return EXTENSION_MAP[ext] ?? null;
}
