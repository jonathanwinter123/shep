import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification as sendNativeNotification,
} from "@tauri-apps/plugin-notification";
import { useTerminalStore } from "../stores/useTerminalStore";

let focused = true;
let permissionGranted = false;

export async function initNotifications() {
  listen("tauri://focus", () => {
    focused = true;
  });
  listen("tauri://blur", () => {
    focused = false;
  });

  permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }
}

export function notifyAgent(ptyId: number, message: string) {
  console.log("[shep] notifyAgent ptyId:", ptyId, "message:", message, "focused:", focused, "permissionGranted:", permissionGranted);
  useTerminalStore.getState().setTabBell(ptyId);

  // TODO: restore `if (!focused)` guard after testing
  try {
    sendNativeNotification({ title: "Shep", body: message });
    console.log("[shep] notification sent");
  } catch (e) {
    console.error("[shep] notification error:", e);
  }
}
