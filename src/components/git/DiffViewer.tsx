interface DiffViewerProps {
  diff: string;
  filePath: string;
}

function classifyLine(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "diff-line--meta";
  if (line.startsWith("+")) return "diff-line--add";
  if (line.startsWith("-")) return "diff-line--del";
  if (line.startsWith("@@")) return "diff-line--hunk";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "diff-line--meta";
  return "diff-line--context";
}

export default function DiffViewer({ diff, filePath }: DiffViewerProps) {
  if (!diff) {
    return (
      <div className="git-panel__diff">
        <div style={{ padding: 24, opacity: 0.45, fontSize: 12 }}>
          No diff available for {filePath}
        </div>
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="git-panel__diff">
      <div className="diff-content">
        {lines.map((line, i) => (
          <div key={i} className={`diff-line ${classifyLine(line)}`}>
            {line || "\u00A0"}
          </div>
        ))}
      </div>
    </div>
  );
}
