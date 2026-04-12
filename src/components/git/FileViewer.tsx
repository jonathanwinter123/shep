import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeStore } from "../../stores/useThemeStore";
import {
  highlightSource,
  langForFile,
  shikiThemeFor,
  type ThemedToken,
} from "../../lib/shikiHighlighter";

interface FileViewerProps {
  contents: string;
  filePath: string;
  loading?: boolean;
  error?: string | null;
  /** Find-in-file term from the right-panel search. When non-empty, lines
   *  whose content contains the term (case-insensitive) get a highlight
   *  class, and the first match is scrolled into view. */
  findTerm?: string;
}

/** Files above this byte count skip Shiki and render as plain monospace —
 *  tokenizing a huge file freezes the UI for seconds and explodes memory.
 *  The Rust side enforces a hard cap at 2 MB; this is the soft cap for
 *  "still preview but without syntax colors." */
const SHIKI_MAX_BYTES = 200 * 1024; // 200 KB

export default function FileViewer({
  contents,
  filePath,
  loading,
  error,
  findTerm = "",
}: FileViewerProps) {
  const theme = useThemeStore((s) => s.theme);
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang = useMemo(() => langForFile(filePath), [filePath]);
  const oversized = contents.length > SHIKI_MAX_BYTES;

  // Pre-compute the set of line indices that match the find term. Empty
  // term returns an empty set (no highlights). Match on raw line content
  // (not Shiki tokens) since tokens don't exist for plain text fallback.
  const matchSet = useMemo(() => {
    const s = new Set<number>();
    const needle = findTerm.trim().toLowerCase();
    if (!needle) return s;
    const lines = contents.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(needle)) s.add(i);
    }
    return s;
  }, [contents, findTerm]);

  // Scroll to the first match whenever the find term changes. Uses the
  // line's index-based attribute so we can find it in the DOM after a
  // token render pass. useEffect + imperative scroll is appropriate here
  // because we're integrating with the DOM (a legitimate effect use).
  useEffect(() => {
    if (matchSet.size === 0 || !scrollRef.current) return;
    const firstIdx = Math.min(...matchSet);
    const el = scrollRef.current.querySelector<HTMLDivElement>(
      `[data-line-idx="${firstIdx}"]`,
    );
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [matchSet]);

  // Tokenize once per (contents, file, theme) triple. Same Shiki effect
  // pattern used by DiffViewer — async external library, cancelled flag
  // guards against stale writes during rapid file/mode switches.
  useEffect(() => {
    if (!lang || !contents || oversized) {
      setTokens(null);
      return;
    }
    const shikiTheme = shikiThemeFor(theme);
    let cancelled = false;
    void (async () => {
      try {
        const result = await highlightSource(contents, lang, shikiTheme);
        if (!cancelled) setTokens(result);
      } catch {
        if (!cancelled) setTokens(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contents, lang, theme, oversized]);

  if (error) {
    return (
      <div className="git-panel__diff">
        <div style={{ padding: 24, opacity: 0.55, fontSize: 12 }}>{error}</div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="git-panel__diff">
        <div style={{ padding: 24, opacity: 0.45, fontSize: 12 }}>Loading…</div>
      </div>
    );
  }
  if (!contents) {
    return (
      <div className="git-panel__diff">
        <div style={{ padding: 24, opacity: 0.45, fontSize: 12 }}>
          (empty file)
        </div>
      </div>
    );
  }

  const lines = contents.split("\n");

  return (
    <div className="git-panel__diff" ref={scrollRef}>
      <div className="diff-content file-view">
        {lines.map((line, i) => {
          const lineTokens = tokens?.[i];
          const isMatch = matchSet.has(i);
          return (
            <div
              key={i}
              data-line-idx={i}
              className={`diff-line diff-line--context${isMatch ? " diff-line--find-match" : ""}`}
            >
              <span className="file-view__line-no">{i + 1}</span>
              {lineTokens && lineTokens.length > 0 ? (
                lineTokens.map((t, ti) => (
                  <span key={ti} style={{ color: t.color }}>
                    {t.content}
                  </span>
                ))
              ) : (
                <span>{line || "\u00A0"}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
