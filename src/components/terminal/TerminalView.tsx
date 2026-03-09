import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { writePty, resizePty } from "../../lib/tauri";
import { registerTerminal, unregisterTerminal } from "../../hooks/usePty";

interface TerminalViewProps {
  ptyId: number;
  visible: boolean;
}

// Keep terminal instances alive across tab switches
const terminalCache = new Map<
  number,
  { term: Terminal; fitAddon: FitAddon }
>();

export default function TerminalView({ ptyId, visible }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const getOrCreateTerminal = useCallback(() => {
    const cached = terminalCache.get(ptyId);
    if (cached) return cached;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
        selectionBackground: "#33467c",
        black: "#15161e",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#bb9af7",
        cyan: "#7dcfff",
        white: "#a9b1d6",
        brightBlack: "#414868",
        brightRed: "#f7768e",
        brightGreen: "#9ece6a",
        brightYellow: "#e0af68",
        brightBlue: "#7aa2f7",
        brightMagenta: "#bb9af7",
        brightCyan: "#7dcfff",
        brightWhite: "#c0caf5",
      },
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    // Send input to PTY
    term.onData((data) => {
      writePty(ptyId, data).catch(console.error);
    });

    const entry = { term, fitAddon };
    terminalCache.set(ptyId, entry);
    return entry;
  }, [ptyId]);

  useEffect(() => {
    if (!containerRef.current || !visible) return;

    const { term, fitAddon } = getOrCreateTerminal();

    if (!mountedRef.current) {
      term.open(containerRef.current);
      mountedRef.current = true;
    }

    // Register after the terminal is opened so buffered PTY output is flushed
    // into a live xterm instance instead of being written before attach.
    registerTerminal(ptyId, term);

    // Fit after mount
    requestAnimationFrame(() => {
      fitAddon.fit();
      resizePty(ptyId, term.cols, term.rows).catch(console.error);
    });

    // ResizeObserver for auto-fitting
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        resizePty(ptyId, term.cols, term.rows).catch(console.error);
      });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [ptyId, visible, getOrCreateTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const cached = terminalCache.get(ptyId);
      if (cached) {
        cached.term.dispose();
        terminalCache.delete(ptyId);
        unregisterTerminal(ptyId);
      }
      mountedRef.current = false;
    };
  }, [ptyId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{
        display: visible ? "block" : "none",
        backgroundColor: "#1a1b26",
      }}
    />
  );
}
