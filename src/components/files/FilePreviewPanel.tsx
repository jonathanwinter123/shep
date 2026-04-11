import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFileExplorerStore } from "../../stores/useFileExplorerStore";
import { getLanguageFromPath } from "../../lib/languageDetection";
import { highlight, getAvailableLanguages } from "../../lib/highlighter";

export default function FilePreviewPanel() {
  const previewFile = useFileExplorerStore((s) => s.previewFile);
  const previewLoading = useFileExplorerStore((s) => s.previewLoading);
  const previewError = useFileExplorerStore((s) => s.previewError);
  const languageOverrides = useFileExplorerStore((s) => s.languageOverrides);
  const setLanguageOverride = useFileExplorerStore(
    (s) => s.setLanguageOverride,
  );
  const clearLanguageOverride = useFileExplorerStore(
    (s) => s.clearLanguageOverride,
  );

  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const highlightGenRef = useRef(0);

  // Resolve language: override > auto-detect > null
  const resolvedLanguage = useMemo(() => {
    if (!previewFile) return null;
    return (
      languageOverrides[previewFile.path] ??
      getLanguageFromPath(previewFile.path)
    );
  }, [previewFile, languageOverrides]);

  // Run highlighting when file or language changes.
  // This is a legitimate useEffect: it syncs React state with an external
  // async system (Shiki WASM highlighter) similar to an imperative library.
  useEffect(() => {
    setHighlightedHtml(null);

    if (!previewFile?.content || !resolvedLanguage) {
      return;
    }

    const gen = ++highlightGenRef.current;
    highlight(previewFile.content, resolvedLanguage).then((html) => {
      // Only apply if this is still the latest request
      if (gen === highlightGenRef.current) {
        setHighlightedHtml(html);
      }
    });
  }, [previewFile?.content, previewFile?.path, resolvedLanguage]);

  // Load available languages list once
  useEffect(() => {
    getAvailableLanguages().then(setAvailableLanguages);
  }, []);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!previewFile) return;
      const lang = e.target.value;
      if (lang === "") {
        clearLanguageOverride(previewFile.path);
        return;
      }
      setLanguageOverride(previewFile.path, lang);
    },
    [previewFile, setLanguageOverride, clearLanguageOverride],
  );

  if (previewLoading) {
    return (
      <div className="absolute inset-0 overflow-y-auto p-6">
        <p className="text-sm opacity-50 mt-8 text-center">
          Loading preview...
        </p>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="absolute inset-0 overflow-y-auto p-6">
        <h2 className="section-label !p-0">File Preview</h2>
        <div
          className="text-sm mt-4 p-3 rounded-md"
          style={{
            background: "rgba(255,80,80,0.1)",
            color: "var(--text-danger, #e55)",
          }}
        >
          <p className="font-medium mb-1">Preview error</p>
          <p className="opacity-70 font-mono text-xs">{previewError}</p>
        </div>
      </div>
    );
  }

  if (!previewFile) {
    return (
      <div className="absolute inset-0 overflow-y-auto p-6">
        <p className="text-sm opacity-50 mt-8 text-center">
          No file selected
        </p>
      </div>
    );
  }

  const fileName = previewFile.path.split("/").pop() ?? previewFile.path;

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h2 className="section-label !p-0">{fileName}</h2>
          <p className="text-xs opacity-40 mt-0.5 truncate">
            {previewFile.path}
          </p>
        </div>
        {availableLanguages.length > 0 && (
          <select
            className="shiki-lang-select"
            value={resolvedLanguage ?? ""}
            onChange={handleLanguageChange}
          >
            <option value="">Plain text</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        )}
      </div>

      {previewFile.truncated && (
        <div
          className="text-sm mb-4 p-3 rounded-md"
          style={{
            background: "rgba(255,200,50,0.1)",
            color: "var(--text-warning, #ca0)",
          }}
        >
          <p className="font-medium">File truncated</p>
          <p className="opacity-70 text-xs mt-0.5">
            This file is too large to display in full. Showing a partial
            preview.
          </p>
        </div>
      )}

      {highlightedHtml ? (
        <div
          className="shiki-container"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre
          className="text-sm font-mono whitespace-pre-wrap break-words p-4 rounded-md"
          style={{
            background: "var(--surface-hover)",
            lineHeight: 1.5,
            tabSize: 2,
          }}
        >
          {previewFile.content}
        </pre>
      )}
    </div>
  );
}
