import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, Skull, ExternalLink, Folder, Bug } from "lucide-react";
import { listListeningPorts, killPort, debugPortScan } from "../../lib/tauri";
import type { PortScanDebug } from "../../lib/tauri";
import { useNoticeStore } from "../../stores/useNoticeStore";
import { getErrorMessage } from "../../lib/errors";
import type { PortInfo } from "../../lib/types";

function formatMemory(kb: number): string {
  if (kb === 0) return "—";
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function formatUptime(raw: string): string {
  if (!raw) return "—";
  return raw.trim();
}

export default function PortsPanel() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [killing, setKilling] = useState<Set<number>>(new Set());
  const [debug, setDebug] = useState<PortScanDebug | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const pushNotice = useNoticeStore((s) => s.pushNotice);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listListeningPorts();
      setPorts(result);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      if (import.meta.env.DEV) console.error("Port scan failed:", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const runDebug = useCallback(async () => {
    setDebug(null);
    setDebugError(null);
    try {
      const result = await debugPortScan();
      setDebug(result);
    } catch (err) {
      setDebugError(getErrorMessage(err));
    }
  }, []);

  // Initial load + auto-refresh every 5s
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const handleKill = useCallback(async (port: PortInfo) => {
    setKilling((prev) => new Set(prev).add(port.pid));
    try {
      await killPort(port.pid);
      pushNotice({
        tone: "success",
        title: "Process killed",
        message: `Stopped ${port.process} (pid ${port.pid}) on port ${port.port}`,
      });
      window.setTimeout(() => void refresh(), 500);
    } catch (err) {
      pushNotice({
        tone: "error",
        title: "Kill failed",
        message: getErrorMessage(err),
      });
    } finally {
      setKilling((prev) => {
        const next = new Set(prev);
        next.delete(port.pid);
        return next;
      });
    }
  }, [pushNotice, refresh]);

  const handleOpenBrowser = useCallback((port: number) => {
    window.open(`http://localhost:${port}`, "_blank");
  }, []);

  // Group by project
  const grouped = ports.reduce<Record<string, PortInfo[]>>((acc, port) => {
    const key = port.project || "Other";
    (acc[key] ??= []).push(port);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-label !p-0">Ports</h2>
        <div className="flex items-center gap-2">
          <button
            className="icon-btn"
            onClick={() => void runDebug()}
            title="Run debug scan"
            aria-label="Debug port scan"
          >
            <Bug size={14} />
          </button>
          <button
            className="icon-btn"
            onClick={() => void refresh()}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh port list"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Debug output */}
      {(debug || debugError) && (
        <div
          className="mb-4 p-3 rounded-md text-xs font-mono overflow-auto"
          style={{ background: "var(--bg-secondary, rgba(255,255,255,0.03))", maxHeight: "400px" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm font-sans">Debug Output</span>
            <button className="icon-btn" onClick={() => { setDebug(null); setDebugError(null); }}>×</button>
          </div>
          {debugError && <p style={{ color: "var(--text-danger, #e55)" }}>Error: {debugError}</p>}
          {debug && (
            <>
              <p><span className="opacity-50">Shell:</span> {debug.shell}</p>
              <p><span className="opacity-50">Exit code:</span> {debug.lsof_exit}</p>
              <p><span className="opacity-50">Lines parsed:</span> {debug.parsed_count}</p>
              <p><span className="opacity-50">After filter (port &ge; 1024):</span> {debug.filtered_count}</p>
              {debug.lsof_stderr && (
                <>
                  <p className="mt-2 opacity-50">stderr:</p>
                  <pre className="whitespace-pre-wrap opacity-70">{debug.lsof_stderr}</pre>
                </>
              )}
              <p className="mt-2 opacity-50">stdout ({debug.lsof_stdout.split("\n").length} lines):</p>
              <pre className="whitespace-pre-wrap opacity-70">{debug.lsof_stdout || "(empty)"}</pre>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm mt-4 p-3 rounded-md" style={{ background: "rgba(255,80,80,0.1)", color: "var(--text-danger, #e55)" }}>
          <p className="font-medium mb-1">Scan error</p>
          <p className="opacity-70 font-mono text-xs">{error}</p>
        </div>
      )}

      {!error && ports.length === 0 && !loading && !debug && (
        <p className="text-sm opacity-50 mt-8 text-center">
          No dev ports detected
        </p>
      )}

      {!error && ports.length === 0 && loading && (
        <p className="text-sm opacity-50 mt-8 text-center">
          Scanning ports...
        </p>
      )}

      {groupKeys.map((group) => (
        <div key={group} className="mb-6">
          <div className="flex items-center gap-1.5 mb-2 opacity-60">
            <Folder size={12} />
            <span className="text-xs font-medium uppercase tracking-wide">{group}</span>
            <span className="text-xs opacity-50">({grouped[group].length})</span>
          </div>

          <div className="flex flex-col gap-1">
            {grouped[group].map((port) => (
              <div
                key={`${port.pid}-${port.port}`}
                className="flex items-center gap-3 px-3 py-2 rounded-md"
                style={{ background: "var(--bg-secondary, rgba(255,255,255,0.03))" }}
              >
                <span
                  className="font-mono text-sm font-semibold shrink-0"
                  style={{ minWidth: "52px" }}
                >
                  :{port.port}
                </span>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{port.process}</span>
                    {port.framework && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "var(--bg-tertiary, rgba(255,255,255,0.06))" }}
                      >
                        {port.framework}
                      </span>
                    )}
                  </div>
                  {port.cwd && (
                    <span className="text-xs opacity-40 truncate">{port.cwd}</span>
                  )}
                </div>

                <span className="text-xs opacity-40 shrink-0 font-mono" title="Uptime">
                  {formatUptime(port.uptime)}
                </span>

                <span className="text-xs opacity-40 shrink-0" style={{ minWidth: "50px" }} title="Memory">
                  {formatMemory(port.memory_kb)}
                </span>

                <span className="text-xs opacity-30 shrink-0 font-mono" title="PID" style={{ minWidth: "44px" }}>
                  {port.pid}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="icon-btn"
                    onClick={() => handleOpenBrowser(port.port)}
                    title={`Open localhost:${port.port}`}
                    aria-label={`Open port ${port.port} in browser`}
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => void handleKill(port)}
                    disabled={killing.has(port.pid)}
                    title={`Kill ${port.process} (pid ${port.pid})`}
                    aria-label={`Kill process on port ${port.port}`}
                    style={{ color: "var(--text-danger, #e55)" }}
                  >
                    <Skull size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
