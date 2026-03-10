import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { CanvasAddon } from "@xterm/addon-canvas";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { writePty, resizePty } from "../../lib/tauri";
import {
  flushPendingOutput,
  registerTerminal,
  unregisterTerminal,
} from "../../hooks/usePty";
import {
  TERMINAL_FONT_FAMILY,
  TERMINAL_FONT_SIZE,
  TERMINAL_LINE_HEIGHT,
} from "../../lib/terminalConfig";

interface TerminalViewProps {
  ptyId: number;
  visible: boolean;
  opacity: number;
}

// Keep terminal instances alive across tab switches
const terminalCache = new Map<
  number,
  { term: Terminal; fitAddon: FitAddon; rendererAddon: WebglAddon | CanvasAddon | null }
>();

function createTerminalTheme(opacity: number) {
  const alpha = Math.min(Math.max(opacity / 100, 0), 1);

  return {
    background: `rgba(13, 19, 31, ${alpha})`,
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
  };
}

export default function TerminalView({
  ptyId,
  visible,
  opacity,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const attachedRef = useRef(false);
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);

  const getOrCreateTerminal = useCallback(() => {
    const cached = terminalCache.get(ptyId);
    if (cached) return cached;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: TERMINAL_FONT_SIZE,
      fontFamily: TERMINAL_FONT_FAMILY,
      lineHeight: TERMINAL_LINE_HEIGHT,
      reflowCursorLine: true,
      theme: createTerminalTheme(opacity),
      scrollback: 10000,
      allowTransparency: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    const unicodeAddon = new Unicode11Addon();
    term.loadAddon(unicodeAddon);
    term.unicode.activeVersion = "11";
    term.loadAddon(new WebLinksAddon());

    let rendererAddon: WebglAddon | CanvasAddon | null = null;
    try {
      rendererAddon = new WebglAddon();
      term.loadAddon(rendererAddon);
    } catch (error) {
      console.warn("Falling back to canvas terminal renderer", error);
      rendererAddon = new CanvasAddon();
      term.loadAddon(rendererAddon);
    }

    // Send input to PTY
    term.onData((data) => {
      writePty(ptyId, data).catch(console.error);
    });

    const entry = { term, fitAddon, rendererAddon };
    terminalCache.set(ptyId, entry);
    return entry;
  }, [opacity, ptyId]);

  const fitAndResize = useCallback(async () => {
    const cached = terminalCache.get(ptyId);
    if (!cached) return;

    cached.fitAddon.fit();
    const size = { cols: cached.term.cols, rows: cached.term.rows };
    const lastSize = lastSizeRef.current;

    if (
      lastSize &&
      lastSize.cols === size.cols &&
      lastSize.rows === size.rows
    ) {
      return;
    }

    lastSizeRef.current = size;
    await resizePty(ptyId, size.cols, size.rows).catch(console.error);
    cached.term.refresh(0, cached.term.rows - 1);
  }, [ptyId]);

  useEffect(() => {
    if (!containerRef.current || !visible) return;

    const { term } = getOrCreateTerminal();
    let disposed = false;

    if (!mountedRef.current) {
      term.open(containerRef.current);
      mountedRef.current = true;
    }

    const attachTerminal = async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) return;

      await fitAndResize();
      if (disposed) return;

      if (!attachedRef.current) {
        registerTerminal(ptyId, term);
        flushPendingOutput(ptyId);
        attachedRef.current = true;
      }

      window.setTimeout(() => {
        if (disposed) return;
        void fitAndResize();
      }, 100);

      if ("fonts" in document) {
        void document.fonts.ready.then(() => {
          if (disposed) return;
          void fitAndResize();
        });
      }
    };

    void attachTerminal();

    // ResizeObserver for auto-fitting
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (disposed) return;
        void fitAndResize();
      });
    });
    observer.observe(containerRef.current);

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [ptyId, visible, getOrCreateTerminal, fitAndResize]);

  useEffect(() => {
    const cached = terminalCache.get(ptyId);
    if (!cached) return;

    cached.term.options.theme = createTerminalTheme(opacity);
    cached.term.refresh(0, cached.term.rows - 1);
  }, [opacity, ptyId]);

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
      attachedRef.current = false;
      lastSizeRef.current = null;
    };
  }, [ptyId]);

  return (
    <div
      className="terminal-view"
      style={{
        display: visible ? "block" : "none",
      }}
    >
      <div
        ref={containerRef}
        className="terminal-surface"
        style={{
          background: `linear-gradient(180deg, rgba(21, 29, 45, ${
            opacity / 100 * 0.62
          }), rgba(10, 15, 24, ${opacity / 100 * 0.72})), rgba(13, 19, 31, ${
            opacity / 100
          })`,
        }}
      />
    </div>
  );
}
