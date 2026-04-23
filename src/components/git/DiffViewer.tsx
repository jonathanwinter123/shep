import { PatchDiff } from "@pierre/diffs/react";
import { useThemeStore } from "../../stores/useThemeStore";
import { getCodeViewCSSVariables, getDiffViewOptions } from "./codeViewTheme";

interface DiffViewerProps {
  diff: string;
  filePath: string;
  findTerm?: string;
  loading?: boolean;
  error?: string | null;
}

export default function DiffViewer({
  diff,
  filePath,
  findTerm = "",
  loading = false,
  error = null,
}: DiffViewerProps) {
  const theme = useThemeStore((s) => s.theme);
  const codeViewCSSVariables = getCodeViewCSSVariables();
  const diffViewOptions = getDiffViewOptions(theme);
  void findTerm;

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
    <div className="git-panel__diff git-panel__diff--pierre">
      <PatchDiff
        patch={diff}
        className="git-panel__diff-surface"
        style={codeViewCSSVariables}
        options={diffViewOptions}
      />
    </div>
  );
}
