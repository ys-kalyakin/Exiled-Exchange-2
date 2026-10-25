import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { isWaylandBackend } from "../windowing/kwin";

export interface InputInjector {
  readonly kind: "libuiohook" | "ydotool";
  readonly available: boolean;
  keyTap: (key: number, modifiers?: number[]) => void;
  keyToggle: (key: number, direction: "down" | "up") => void;
}

// UiohookKey code -> enum member name ("C", "Ctrl", "ArrowRight", ...)
const CodeToName = new Map<number, string>(
  Object.entries(UiohookKey).map(([name, code]) => [code, name]),
);

// Linux evdev key codes (input-event-codes.h) for keys used by this app.
// uiohook uses XT set-1 scancodes, which match evdev for the base keys
// (letters, digits, Enter=28, Ctrl=29, ...); the nav cluster and right
// modifiers diverge and are mapped explicitly.
const EvdevCode: Record<string, number> = {
  Escape: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
  0: 11,
  Minus: 12,
  Equal: 13,
  Backspace: 14,
  Tab: 15,
  Q: 16,
  W: 17,
  E: 18,
  R: 19,
  T: 20,
  Y: 21,
  U: 22,
  I: 23,
  O: 24,
  P: 25,
  LeftBracket: 26,
  RightBracket: 27,
  Enter: 28,
  Ctrl: 29,
  A: 30,
  S: 31,
  D: 32,
  F: 33,
  G: 34,
  H: 35,
  J: 36,
  K: 37,
  L: 38,
  Semicolon: 39,
  Apostrophe: 40,
  Grave: 41,
  Shift: 42,
  Backslash: 43,
  Z: 44,
  X: 45,
  C: 46,
  V: 47,
  B: 48,
  N: 49,
  M: 50,
  Comma: 51,
  Period: 52,
  Slash: 53,
  ShiftRight: 54,
  Alt: 56,
  Space: 57,
  F1: 59,
  F2: 60,
  F3: 61,
  F4: 62,
  F5: 63,
  F6: 64,
  F7: 65,
  F8: 66,
  F9: 67,
  F10: 68,
  F11: 87,
  F12: 88,
  Home: 102,
  ArrowUp: 103,
  PageUp: 104,
  ArrowLeft: 105,
  ArrowRight: 106,
  End: 107,
  ArrowDown: 108,
  PageDown: 109,
  Insert: 110,
  Delete: 111,
  CtrlRight: 97,
  AltRight: 100,
  Meta: 125,
};

const warnUnknown = new Set<string>();

function evdevCode(key: number): number | undefined {
  const name = CodeToName.get(key);
  const code = name !== undefined ? EvdevCode[name] : undefined;
  if (code === undefined) {
    const label = name ?? `code ${key}`;
    if (!warnUnknown.has(label)) {
      warnUnknown.add(label);
      console.warn(
        `[InputInjector] no evdev code for uiohook key "${label}", injection skipped`,
      );
    }
  }
  return code;
}

class LibuiohookInjector implements InputInjector {
  readonly kind = "libuiohook" as const;
  readonly available = true;

  keyTap(key: number, modifiers?: number[]) {
    uIOhook.keyTap(key, modifiers);
  }

  keyToggle(key: number, direction: "down" | "up") {
    uIOhook.keyToggle(key, direction);
  }
}

class YdotoolInjector implements InputInjector {
  readonly kind = "ydotool" as const;
  readonly available: boolean;
  private readonly binary?: string;
  private readonly socket?: string;

  constructor() {
    this.binary = findBinary("ydotool");
    this.socket = this.binary !== undefined ? findYdotooldSocket() : undefined;
    this.available = this.binary !== undefined && this.socket !== undefined;
  }

  keyTap(key: number, modifiers: number[] = []) {
    const downCodes = [...modifiers, key].map(evdevCode);
    const upCodes = [key, ...[...modifiers].reverse()].map(evdevCode);
    if (downCodes.concat(upCodes).some((code) => code === undefined)) return;
    const events = [
      ...downCodes.map((code) => `${code}:1`),
      ...upCodes.map((code) => `${code}:0`),
    ];
    this.run(events);
  }

  keyToggle(key: number, direction: "down" | "up") {
    const code = evdevCode(key);
    if (code === undefined) return;
    this.run([`${code}:${direction === "down" ? 1 : 0}`]);
  }

  private run(events: string[]) {
    if (this.binary === undefined || this.socket === undefined) return;
    execFile(
      this.binary,
      ["key", ...events],
      { env: { ...process.env, YDOTOOL_SOCKET: this.socket } },
      (error) => {
        if (error) {
          console.warn(`[InputInjector] ydotool failed: ${error.message}`);
        }
      },
    );
  }
}

function findBinary(name: string): string | undefined {
  const paths = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of paths) {
    const candidate = path.join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function findYdotooldSocket(): string | undefined {
  const runtime = process.env.XDG_RUNTIME_DIR ?? os.tmpdir();
  const candidates = [
    process.env.YDOTOOL_SOCKET,
    // systemd user unit (this repo's ~/.config/systemd/user/ydotool.service)
    path.join(runtime, "ydotool.socket"),
    path.join(runtime, "ydotoold.socket"),
    // ydotoold defaults when started from a user or root session
    path.join(runtime, ".ydotool_socket"),
    "/tmp/.ydotool_socket",
    "/run/ydotoold.socket",
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

let injector: InputInjector | undefined;

export function getInjector(): InputInjector {
  if (!injector) {
    injector = isWaylandBackend()
      ? new YdotoolInjector()
      : new LibuiohookInjector();
  }
  return injector;
}
