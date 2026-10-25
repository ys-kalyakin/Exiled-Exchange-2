export type OverlayBackendKind = "x11" | "wayland";

/**
 * Title of the overlay BrowserWindow, used by the KWin script to find it
 * among the compositor's windows (set by renderer/index.html).
 */
export const OVERLAY_WINDOW_TITLE = "Exiled Exchange 2";

export function detectBackend(): OverlayBackendKind {
  const flag = process.argv.find((arg) => arg.startsWith("--overlay-backend="));
  if (flag) {
    const value = flag.slice("--overlay-backend=".length);
    if (value === "x11" || value === "wayland") return value;
  }
  if (
    process.env.XDG_SESSION_TYPE === "wayland" &&
    process.env.WAYLAND_DISPLAY
  ) {
    return "wayland";
  }
  return "x11";
}

export function isWaylandBackend(): boolean {
  return detectBackend() === "wayland";
}

export { getKWinBridge, initKWinBridge } from "./KWinBridge";
export type { KWinBridge, KWinBridgeOptions } from "./KWinBridge";
