import { useEffect, useState } from "react";
import { useThemeStore } from "../../stores/useThemeStore";
import { getMarkdownRenderer } from "../../lib/markdownRenderer";
import { shikiThemeFor } from "../../lib/shikiHighlighter";

interface MarkdownViewerProps {
  contents: string;
}

export default function MarkdownViewer({ contents }: MarkdownViewerProps) {
  const theme = useThemeStore((s) => s.theme);
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    const themeName = shikiThemeFor(theme);

    void (async () => {
      try {
        const renderer = await getMarkdownRenderer(themeName);
        const next = renderer.render(contents);
        if (!cancelled) setHtml(next);
      } catch {
        if (!cancelled) setHtml("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contents, theme]);

  return (
    <div className="git-panel__diff markdown-view">
      <div
        className="markdown-view__content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
