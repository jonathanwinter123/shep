import { mcpPrepareTab, mcpCleanupTab } from "./tauri";

export interface McpInjection {
  args: string[];
  cleanup: () => Promise<void>;
}

/**
 * Prepare per-tab MCP wiring: issue a token, write a tempfile MCP config, and
 * return the CLI args to pass to `claude` plus a cleanup callback.
 *
 * Returns `null` if the MCP server isn't running yet (or the prepare command
 * fails for any other reason) — the caller can spawn `claude` without the
 * MCP injection in that case (graceful degradation).
 */
export async function buildMcpInjection(tabId: string): Promise<McpInjection | null> {
  let prep;
  try {
    prep = await mcpPrepareTab(tabId);
  } catch {
    return null;
  }

  return {
    args: ["--mcp-config", prep.configPath, "--strict-mcp-config"],
    cleanup: async () => {
      try {
        await mcpCleanupTab(prep.token, prep.configPath);
      } catch {
        // best-effort cleanup; ignore failures
      }
    },
  };
}
