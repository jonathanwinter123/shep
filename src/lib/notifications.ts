import { listen } from "@tauri-apps/api/event";
import { sendNotification } from "./tauri";
import { useTerminalStore } from "../stores/useTerminalStore";

let focused = true;

export function initNotifications() {
  listen("tauri://focus", () => {
    focused = true;
  });
  listen("tauri://blur", () => {
    focused = false;
  });
}

export function notifyAgent(ptyId: number, message: string) {
  console.log("[shep] notifyAgent ptyId:", ptyId, "message:", message, "focused:", focused);
  useTerminalStore.getState().setTabBell(ptyId);

  // TODO: restore `if (!focused)` guard after testing
  sendNotification("Shep", message);
}
