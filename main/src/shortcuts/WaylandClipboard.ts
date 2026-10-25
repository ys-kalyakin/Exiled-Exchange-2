import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { Message, sessionBus } from "dbus-next";
import { clipboard } from "electron";
import { isWaylandBackend } from "../windowing/kwin";

const execFile = promisify(execFileCb);

const KLIPPER_DEST = "org.kde.klipper";
const KLIPPER_PATH = "/klipper";
const KLIPPER_IFACE = "org.kde.klipper.klipper";

let bus: ReturnType<typeof sessionBus> | undefined;

async function klipperCall(
  member: string,
  signature?: string,
  body?: unknown[],
): Promise<string | undefined> {
  bus ??= sessionBus();
  const reply = await bus.call(
    new Message({
      destination: KLIPPER_DEST,
      path: KLIPPER_PATH,
      interface: KLIPPER_IFACE,
      member,
      signature,
      body,
    }),
  );
  return reply ? (reply.body?.[0] as string | undefined) : undefined;
}

/**
 * Clipboard access that works while the game owns keyboard focus.
 *
 * Chromium's ozone-wayland clipboard layer only serves and reads selection
 * data while an app window is focused (electron#54645), which is never the
 * case during a price check, so on the KDE Wayland backend reads and writes
 * go through Klipper instead, falling back to the wl-clipboard binaries.
 */
export async function readClipboardText(): Promise<string> {
  if (process.platform === "linux" && isWaylandBackend()) {
    try {
      const text = await klipperCall("getClipboardContents");
      if (typeof text === "string") return text;
    } catch {
      // no klipper on this desktop, fall through
    }
    try {
      const { stdout } = await execFile("wl-paste", ["--no-newline"]);
      return stdout;
    } catch {
      // no wl-clipboard either, fall through to electron
    }
  }
  return await clipboard.readText();
}

export async function writeClipboardText(text: string): Promise<void> {
  if (process.platform === "linux" && isWaylandBackend()) {
    try {
      await klipperCall("setClipboardContents", "s", [text]);
      return;
    } catch {
      // fall through
    }
    try {
      // wl-copy daemonizes to serve the selection, the parent exits
      await execFile("wl-copy", [text]);
      return;
    } catch {
      // fall through
    }
  }
  clipboard.writeText(text);
}
