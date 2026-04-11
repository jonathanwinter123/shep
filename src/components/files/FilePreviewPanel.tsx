import { useFileExplorerStore } from "../../stores/useFileExplorerStore";

export default function FilePreviewPanel() {
  const previewFile = useFileExplorerStore((s) => s.previewFile);
  const previewLoading = useFileExplorerStore((s) => s.previewLoading);
  const previewError = useFileExplorerStore((s) => s.previewError);

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
      <div className="mb-4">
        <h2 className="section-label !p-0">{fileName}</h2>
        <p className="text-xs opacity-40 mt-0.5">{previewFile.path}</p>
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
    </div>
  );
}
