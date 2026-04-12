import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeStore } from "../../stores/useThemeStore";
import {
  highlightSource,
  langForFile,
  shikiThemeFor,
  type ThemedToken,
} from "../../lib/shikiHighlighter";

interface DiffViewerProps {
  diff: string;
  filePath: string;
  /** Find-in-file term from the right-panel search. When non-empty, diff
   *  lines whose content contains the term (case-insensitive) get a
   *  highlight class, and the first match is scrolled into view. */
  findTerm?: string;
}

type LineType = "add" | "del" | "context" | "hunk" | "meta";

interface ParsedLine {
  type: LineType;
  content: string; // text without +/-/space prefix (for add/del/context)
  raw: string;     // original line verbatim (used by hunk/meta rendering)
  newIdx?: number; // index into the reconstructed new-side source
  oldIdx?: number; // index into the reconstructed old-side source
}

interface ParsedDiff {
  lines: ParsedLine[];
  newSide: string;
  oldSide: string;
}

/**
 * Parse a unified diff into per-line records plus two reconstructed source
 * strings — one for the "new side" (context + additions) and one for the
 * "old side" (context + deletions). Each add/del/context line stores an
 * index into whichever side it belongs to, so after highlighting each side
 * with Shiki we can look up the right token array per diff line.
 *
 * This split matters: highlighting the raw diff as one blob fails because
 * +/- lines interleave and break multi-line tokens (strings, comments,
 * block structure). Each side on its own is a coherent snapshot of the file.
 */
function parseDiff(diff: string): ParsedDiff {
  const rawLines = diff.split("\n");
  const lines: ParsedLine[] = [];
  const newSide: string[] = [];
  const oldSide: string[] = [];

  for (const raw of rawLines) {
    if (raw.startsWith("@@")) {
      lines.push({ type: "hunk", content: "", raw });
      continue;
    }
    if (
      raw.startsWith("+++") ||
      raw.startsWith("---") ||
      raw.startsWith("diff ") ||
      raw.startsWith("index ") ||
      raw.startsWith("new file") ||
      raw.startsWith("deleted file") ||
      raw.startsWith("similarity ") ||
      raw.startsWith("rename ")
    ) {
      lines.push({ type: "meta", content: "", raw });
      continue;
    }
    if (raw.startsWith("+")) {
      const content = raw.slice(1);
      lines.push({ type: "add", content, raw, newIdx: newSide.length });
      newSide.push(content);
      continue;
    }
    if (raw.startsWith("-")) {
      const content = raw.slice(1);
      lines.push({ type: "del", content, raw, oldIdx: oldSide.length });
      oldSide.push(content);
      continue;
    }
    // Context line: leading space, or truly empty line inside a hunk
    const content = raw.startsWith(" ") ? raw.slice(1) : raw;
    lines.push({
      type: "context",
      content,
      raw,
      newIdx: newSide.length,
      oldIdx: oldSide.length,
    });
    newSide.push(content);
    oldSide.push(content);
  }

  return { lines, newSide: newSide.join("\n"), oldSide: oldSide.join("\n") };
}

interface HighlightState {
  newTokens: ThemedToken[][] | null;
  oldTokens: ThemedToken[][] | null;
}

const EMPTY_HIGHLIGHT: HighlightState = { newTokens: null, oldTokens: null };

function renderTokens(tokens: ThemedToken[] | undefined, fallback: string) {
  if (!tokens || tokens.length === 0) {
    return fallback || "\u00A0";
  }
  return tokens.map((t, i) => (
    <span key={i} style={{ color: t.color }}>
      {t.content}
    </span>
  ));
}

export default function DiffViewer({ diff, filePath, findTerm = "" }: DiffViewerProps) {
  const theme = useThemeStore((s) => s.theme);
  const [highlight, setHighlight] = useState<HighlightState>(EMPTY_HIGHLIGHT);
  const scrollRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseDiff(diff), [diff]);
  const lang = useMemo(() => langForFile(filePath), [filePath]);

  // Pre-compute the set of parsed-line indices matching the find term.
  // We match against `content` (prefix-stripped) so the +/-/space prefix
  // doesn't bleed into matches. Hunk/meta lines are skipped — finding
  // "foo" shouldn't highlight `@@ -foo,5 +foo,5 @@`.
  const matchSet = useMemo(() => {
    const s = new Set<number>();
    const needle = findTerm.trim().toLowerCase();
    if (!needle) return s;
    for (let i = 0; i < parsed.lines.length; i++) {
      const line = parsed.lines[i];
      if (line.type === "hunk" || line.type === "meta") continue;
      if (line.content.toLowerCase().includes(needle)) s.add(i);
    }
    return s;
  }, [parsed, findTerm]);

  // Scroll to the first match whenever the find term changes. Imperative
  // DOM scroll — legitimate effect use for integrating with the rendered DOM.
  useEffect(() => {
    if (matchSet.size === 0 || !scrollRef.current) return;
    const firstIdx = Math.min(...matchSet);
    const el = scrollRef.current.querySelector<HTMLDivElement>(
      `[data-line-idx="${firstIdx}"]`,
    );
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [matchSet]);

  // Run Shiki when the diff, file, or theme changes. Shiki is an async,
  // imperative external library (explicitly listed as a legitimate effect use
  // in CLAUDE.md), and the result has to be stored in state because it's
  // async-derived — useMemo can't wait on a promise. The `cancelled` flag
  // avoids setting stale state if the user rapidly switches files.
  useEffect(() => {
    if (!lang || parsed.lines.length === 0) {
      setHighlight(EMPTY_HIGHLIGHT);
      return;
    }
    const shikiTheme = shikiThemeFor(theme);
    let cancelled = false;
    void (async () => {
      try {
        const [newTokens, oldTokens] = await Promise.all([
          parsed.newSide
            ? highlightSource(parsed.newSide, lang, shikiTheme)
            : Promise.resolve<ThemedToken[][]>([]),
          parsed.oldSide
            ? highlightSource(parsed.oldSide, lang, shikiTheme)
            : Promise.resolve<ThemedToken[][]>([]),
        ]);
        if (!cancelled) setHighlight({ newTokens, oldTokens });
      } catch {
        if (!cancelled) setHighlight(EMPTY_HIGHLIGHT);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parsed, lang, theme]);

  if (!diff) {
    return (
      <div className="git-panel__diff">
        <div style={{ padding: 24, opacity: 0.45, fontSize: 12 }}>
          No diff available for {filePath}
        </div>
      </div>
    );
  }

  return (
    <div className="git-panel__diff" ref={scrollRef}>
      <div className="diff-content">
        {parsed.lines.map((line, i) => {
          if (line.type === "hunk" || line.type === "meta") {
            return (
              <div key={i} data-line-idx={i} className={`diff-line diff-line--${line.type}`}>
                <span className="diff-line__prefix">{"\u00A0"}</span>
                {line.raw || "\u00A0"}
              </div>
            );
          }

          const prefix = line.type === "add" ? "+" : line.type === "del" ? "-" : "\u00A0";
          const tokens =
            line.type === "del"
              ? line.oldIdx !== undefined
                ? highlight.oldTokens?.[line.oldIdx]
                : undefined
              : line.newIdx !== undefined
                ? highlight.newTokens?.[line.newIdx]
                : undefined;

          const isMatch = matchSet.has(i);

          return (
            <div
              key={i}
              data-line-idx={i}
              className={`diff-line diff-line--${line.type}${isMatch ? " diff-line--find-match" : ""}`}
            >
              <span className="diff-line__prefix">{prefix}</span>
              {renderTokens(tokens, line.content)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
