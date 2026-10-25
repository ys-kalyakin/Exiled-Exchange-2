import { Host } from "@/web/background/IPC";
import {
  GAMEPAD_BUTTON_INTENTS,
  KEYBOARD_KEY_INTENTS,
  isDirectional,
} from "./buttonMap";
import type { GpIntent } from "./types";

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

export type GamepadButtonListener = (
  button: string,
  phase: "down" | "up",
) => void;
export type KeyboardButtonListener = (
  key: string,
  phase: "down" | "up",
  isRepeat: boolean,
) => void;

export interface IntentSourceOptions {
  onIntent: (intent: GpIntent) => void;
  repeatDelayMs?: number;
  repeatIntervalMs?: number;
  subscribeGamepad?: (listener: GamepadButtonListener) => () => void;
  subscribeKeyboard?: (listener: KeyboardButtonListener) => () => void;
}

/**
 * Turns raw gamepad buttons and keyboard keys into navigation intents.
 * Directional intents auto-repeat while held (the hold timers live here,
 * so the browser's own key-repeat for keyboard events is ignored).
 */
export function createIntentSource(options: IntentSourceOptions) {
  const {
    onIntent,
    repeatDelayMs = REPEAT_DELAY_MS,
    repeatIntervalMs = REPEAT_INTERVAL_MS,
  } = options;

  let held: { intent: GpIntent; cancel: () => void } | null = null;

  function pressHeld(intent: GpIntent) {
    releaseHeld();
    let interval: ReturnType<typeof setInterval> | undefined;
    // first repeat fires at the delay, then at the interval
    const delay = setTimeout(() => {
      onIntent(intent);
      interval = setInterval(() => onIntent(intent), repeatIntervalMs);
    }, repeatDelayMs);
    held = {
      intent,
      cancel: () => {
        clearTimeout(delay);
        if (interval !== undefined) clearInterval(interval);
      },
    };
  }

  function releaseHeld() {
    if (!held) return;
    held.cancel();
    held = null;
  }

  function handlePress(intent: GpIntent) {
    onIntent(intent);
    if (isDirectional(intent)) pressHeld(intent);
  }

  const subscribeGamepad = options.subscribeGamepad ?? defaultSubscribeGamepad;
  const subscribeKeyboard = options.subscribeKeyboard ?? defaultSubscribeKeyboard;

  const offGamepad = subscribeGamepad((button, phase) => {
    const intent = GAMEPAD_BUTTON_INTENTS[button];
    if (!intent) return;
    if (phase === "down") handlePress(intent);
    else releaseHeld();
  });

  const offKeyboard = subscribeKeyboard((key, phase, isRepeat) => {
    const intent = KEYBOARD_KEY_INTENTS[key];
    if (!intent) return;
    if (phase === "down") {
      if (isRepeat) return; // holds repeat through the timer above
      handlePress(intent);
    } else {
      releaseHeld();
    }
  });

  return {
    dispose() {
      releaseHeld();
      offGamepad();
      offKeyboard();
    },
  };
}

function defaultSubscribeGamepad(listener: GamepadButtonListener) {
  if (!Host.isElectron) return () => {};
  const controller = Host.onEvent("MAIN->CLIENT::gamepad-input", (e) =>
    listener(e.button, e.phase),
  );
  return () => controller.abort();
}

function defaultSubscribeKeyboard(listener: KeyboardButtonListener) {
  if (!Host.isElectron) return () => {};
  const onKeydown = (e: KeyboardEvent) => {
    if (!(e.key in KEYBOARD_KEY_INTENTS)) return;
    if (nativeKeyHandled(e)) return;
    e.preventDefault();
    listener(e.key, "down", e.repeat);
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (!(e.key in KEYBOARD_KEY_INTENTS)) return;
    listener(e.key, "up", e.repeat);
  };
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("keyup", onKeyup);
  return () => {
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("keyup", onKeyup);
  };
}

/**
 * Keys the currently focused native control handles itself: caret movement
 * in text inputs, native `<select>` behavior, button activation with Enter.
 */
function nativeKeyHandled(e: KeyboardEvent): boolean {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.matches("textarea, select, [contenteditable='true']")) return true;
  if (target instanceof HTMLInputElement) {
    const { type } = target;
    if (
      type === "checkbox" ||
      type === "radio" ||
      type === "button" ||
      type === "submit"
    ) {
      return false;
    }
    return true;
  }
  if (target instanceof HTMLButtonElement) return e.key === "Enter";
  return false;
}

if (import.meta.vitest) {
  const { it, expect, vi } = import.meta.vitest;

  function createTestSource(intents: GpIntent[]) {
    let gamepadListener: ((b: string, p: "down" | "up") => void) | undefined;
    let keyboardListener:
      | ((key: string, phase: "down" | "up", isRepeat: boolean) => void)
      | undefined;
    const source = createIntentSource({
      onIntent: (intent) => intents.push(intent),
      subscribeGamepad: (listener) => {
        gamepadListener = listener;
        return () => {
          gamepadListener = undefined;
        };
      },
      subscribeKeyboard: (listener) => {
        keyboardListener = listener;
        return () => {
          keyboardListener = undefined;
        };
      },
    });
    return { source, gamepadListener, keyboardListener };
  }

  it("fires once on press, then auto-repeats while held", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents);

    gamepadListener!("DPAD_DOWN", "down");
    expect(intents).toHaveLength(1);

    vi.advanceTimersByTime(400);
    expect(intents).toHaveLength(2); // repeat delay elapsed

    vi.advanceTimersByTime(80);
    expect(intents).toHaveLength(3);
    vi.advanceTimersByTime(80);
    expect(intents).toHaveLength(4);

    gamepadListener!("DPAD_DOWN", "up");
    vi.advanceTimersByTime(1000);
    expect(intents).toHaveLength(4); // release stops the repeats

    source.dispose();
    vi.useRealTimers();
  });

  it("replaces the held direction on a new press", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents);

    gamepadListener!("DPAD_DOWN", "down");
    vi.advanceTimersByTime(400);
    gamepadListener!("DPAD_UP", "down"); // replaces the held down press
    vi.advanceTimersByTime(400);
    // down repeat cancelled + up fired immediately, then one up repeat
    expect(intents).toEqual([
      { kind: "move", axis: "row", delta: 1 },
      { kind: "move", axis: "row", delta: 1 },
      { kind: "move", axis: "row", delta: -1 },
      { kind: "move", axis: "row", delta: -1 },
    ]);

    source.dispose();
    vi.useRealTimers();
  });

  it("does not repeat activate and back intents", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents);

    gamepadListener!("A", "down");
    gamepadListener!("B", "down");
    vi.advanceTimersByTime(1000);
    expect(intents).toEqual([
      { kind: "activate" },
      { kind: "back" },
    ]);

    source.dispose();
    vi.useRealTimers();
  });

  it("ignores the browser key-repeat and repeats held keys itself", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, keyboardListener } = createTestSource(intents);

    keyboardListener!("ArrowDown", "down", false);
    keyboardListener!("ArrowDown", "down", true); // OS repeat, ignored
    keyboardListener!("ArrowDown", "down", true);
    expect(intents).toHaveLength(1);

    vi.advanceTimersByTime(400);
    expect(intents).toHaveLength(2);

    keyboardListener!("ArrowDown", "up", false);
    vi.advanceTimersByTime(1000);
    expect(intents).toHaveLength(2);

    source.dispose();
    vi.useRealTimers();
  });

  it("cancels the hold timer on dispose", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents);

    gamepadListener!("DPAD_DOWN", "down");
    source.dispose();
    vi.advanceTimersByTime(2000);
    expect(intents).toHaveLength(1);

    vi.useRealTimers();
  });
}
