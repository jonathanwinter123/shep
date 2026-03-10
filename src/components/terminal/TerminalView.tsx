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
import { createTerminalTheme } from "./terminalTheme";
import { useThemeStore } from "../../stores/useThemeStore";

interface TerminalViewProps {
  ptyId: number;
  visible: boolean;
}

// Keep terminal instances alive across tab switches
export const terminalCache = new Map<
  number,
  { term: Terminal; fitAddon: FitAddon; rendererAddon: WebglAddon | CanvasAddon | null }
>();

export default function TerminalView({
  ptyId,
  visible,
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
      theme: createTerminalTheme(useThemeStore.getState().theme),
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

    // Send input to PTY
    term.onData((data) => {
      writePty(ptyId, data).catch(console.error);
    });

    const entry = { term, fitAddon, rendererAddon: null as WebglAddon | CanvasAddon | null };
    terminalCache.set(ptyId, entry);
    return entry;
  }, [ptyId]);

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

      // Load renderer addon after open() so it can access the DOM.
      // Canvas addon handles alpha compositing correctly for glass transparency.
      // Fall back to WebGL if Canvas fails.
      const cached = terminalCache.get(ptyId);
      if (cached && !cached.rendererAddon) {
        try {
          const canvas = new CanvasAddon();
          term.loadAddon(canvas);
          cached.rendererAddon = canvas;
        } catch (err) {
          console.warn("Canvas renderer failed, trying WebGL:", err);
          try {
            const webgl = new WebglAddon();
            term.loadAddon(webgl);
            cached.rendererAddon = webgl;
          } catch (err2) {
            console.warn("No accelerated renderer available:", err2);
          }
        }
      }
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
      <div className="terminal-underlay" />
      <div ref={containerRef} className="terminal-surface" />
    </div>
  );
}
