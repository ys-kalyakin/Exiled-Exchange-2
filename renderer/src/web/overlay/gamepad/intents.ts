import { Host } from "@/web/background/IPC";
import { GAMEPAD_BUTTON_INTENTS, KEYBOARD_KEY_INTENTS, isDirectional } from "./buttonMap";
import type { GamepadConfig } from "./config";
import type { GpIntent } from "./types";

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

export type GamepadButtonListener = (
  button: string,
  phase: "down" | "up",
) => void;
export type GamepadAxisListener = (x: number, y: number) => void;
export type KeyboardButtonListener = (
  key: string,
  phase: "down" | "up",
  isRepeat: boolean,
) => void;

export interface IntentSourceOptions {
  onIntent: (intent: GpIntent) => void;
  repeatDelayMs?: number;
  repeatIntervalMs?: number;
  /**
   * Fork: gamepad support — per-event source of the gamepad config (button
   * map, timings, dead-zone, enabled toggle). A missing config falls back to
   * the default button map; a config with `navigationEnabled: false` disables
   * the whole gamepad input path.
   */
  getGamepadConfig?: () => GamepadConfig | undefined;
  subscribeGamepad?: (listener: GamepadButtonListener) => () => void;
  subscribeAxis?: (listener: GamepadAxisListener) => () => void;
  subscribeKeyboard?: (listener: KeyboardButtonListener) => () => void;
}

interface RepeatTimings {
  delay: number;
  interval: number;
}

/**
 * Turns raw gamepad buttons, stick axes and keyboard keys into navigation
 * intents. Directional intents auto-repeat while held (the hold timers live
 * here, so the browser's own key-repeat for keyboard events is ignored).
 */
export function createIntentSource(options: IntentSourceOptions) {
  const {
    onIntent,
    repeatDelayMs = REPEAT_DELAY_MS,
    repeatIntervalMs = REPEAT_INTERVAL_MS,
  } = options;

  let held: { intent: GpIntent; cancel: () => void } | null = null;
  // whether the current hold was started by the stick (its centering must
  // not cancel a hold started by a d-pad press afterwards)
  let stickHolds = false;

  function defaultTimings(): RepeatTimings {
    return { delay: repeatDelayMs, interval: repeatIntervalMs };
  }

  function pressHeld(
    intent: GpIntent,
    timings: RepeatTimings = defaultTimings(),
  ) {
    releaseHeld();
    let interval: ReturnType<typeof setInterval> | undefined;
    // first repeat fires at the delay, then at the interval
    const delay = setTimeout(() => {
      onIntent(intent);
      interval = setInterval(() => onIntent(intent), timings.interval);
    }, timings.delay);
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

  function handlePress(intent: GpIntent, timings?: RepeatTimings) {
    onIntent(intent);
    if (isDirectional(intent)) pressHeld(intent, timings);
  }

  function gamepadTimings(config: GamepadConfig | undefined): RepeatTimings {
    if (!config) return defaultTimings();
    return { delay: config.repeatDelayMs, interval: config.repeatIntervalMs };
  }

  function resolveButtonIntent(
    config: GamepadConfig | undefined,
    button: string,
  ): GpIntent | "unmapped" | undefined {
    return config
      ? config.buttonIntents[button] ?? GAMEPAD_BUTTON_INTENTS[button]
      : GAMEPAD_BUTTON_INTENTS[button];
  }

  const subscribeGamepad = options.subscribeGamepad ?? defaultSubscribeGamepad;
  const subscribeAxis = options.subscribeAxis ?? defaultSubscribeAxis;
  const subscribeKeyboard =
    options.subscribeKeyboard ?? defaultSubscribeKeyboard;

  const offGamepad = subscribeGamepad((button, phase) => {
    const config = options.getGamepadConfig?.();
    if (config && !config.navigationEnabled) {
      if (phase === "up") releaseHeld();
      return;
    }
    const intent = resolveButtonIntent(config, button);
    if (!intent || intent === "unmapped") return;
    if (phase === "down") handlePress(intent, gamepadTimings(config));
    else releaseHeld();
  });

  const offAxis = subscribeAxis((x, y) => {
    const config = options.getGamepadConfig?.();
    if (config && !config.navigationEnabled) {
      // treat as centered so a re-enabled stick starts from a clean state
      stickHolds = false;
      releaseHeld();
      return;
    }
    handleStick(x, y, config);
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

  /**
   * Converts left-stick deflection into the same directional intents as the
   * d-pad, following the dominant axis. Crossing out of the dead-zone acts
   * as a press (with the held/auto-repeat machinery), centering acts as a
   * release.
   */
  function handleStick(x: number, y: number, config?: GamepadConfig) {
    const deadZone = config?.stickDeadZone ?? 0.5;
    const deflected = Math.max(Math.abs(x), Math.abs(y)) > deadZone;
    if (!deflected) {
      if (stickHolds) {
        stickHolds = false;
        releaseHeld();
      }
      return;
    }
    const intent: GpIntent =
      Math.abs(x) > Math.abs(y)
        ? { kind: "move", axis: "control", delta: x > 0 ? 1 : -1 }
        : { kind: "move", axis: "row", delta: y > 0 ? 1 : -1 };
    if (stickHolds && held && isSameIntent(held.intent, intent)) return;
    stickHolds = true;
    handlePress(intent, gamepadTimings(config));
  }

  function isSameIntent(a: GpIntent, b: GpIntent): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === "move" && b.kind === "move") {
      return a.axis === b.axis && a.delta === b.delta;
    }
    return true;
  }

  return {
    dispose() {
      releaseHeld();
      offGamepad();
      offAxis();
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

function defaultSubscribeAxis(listener: GamepadAxisListener) {
  if (!Host.isElectron) return () => {};
  const controller = Host.onEvent("MAIN->CLIENT::gamepad-axis", (e) =>
    listener(e.x, e.y),
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

  function createTestSource(
    intents: GpIntent[],
    opts: {
      getGamepadConfig?: () => GamepadConfig | undefined;
    } = {},
  ) {
    let gamepadListener: ((b: string, p: "down" | "up") => void) | undefined;
    let axisListener: ((x: number, y: number) => void) | undefined;
    let keyboardListener:
      | ((key: string, phase: "down" | "up", isRepeat: boolean) => void)
      | undefined;
    const source = createIntentSource({
      onIntent: (intent) => intents.push(intent),
      getGamepadConfig: opts.getGamepadConfig,
      subscribeGamepad: (listener) => {
        gamepadListener = listener;
        return () => {
          gamepadListener = undefined;
        };
      },
      subscribeAxis: (listener) => {
        axisListener = listener;
        return () => {
          axisListener = undefined;
        };
      },
      subscribeKeyboard: (listener) => {
        keyboardListener = listener;
        return () => {
          keyboardListener = undefined;
        };
      },
    });
    return { source, gamepadListener, axisListener, keyboardListener };
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

  it("uses the configured button map and honors unmapped buttons", () => {
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents, {
      getGamepadConfig: () => ({
        navigationEnabled: true,
        buttonIntents: {
          ...GAMEPAD_BUTTON_INTENTS,
          A: "unmapped",
          START: { kind: "activate" },
        },
        repeatDelayMs: 400,
        repeatIntervalMs: 80,
        stickDeadZone: 0.5,
        overlayCombo: null,
      }),
    });

    gamepadListener!("A", "down");
    gamepadListener!("START", "down");
    expect(intents).toEqual([{ kind: "activate" }]);

    source.dispose();
  });

  it("drops all gamepad input while navigation is disabled", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents, {
      getGamepadConfig: () => ({
        navigationEnabled: false,
        buttonIntents: { ...GAMEPAD_BUTTON_INTENTS },
        repeatDelayMs: 400,
        repeatIntervalMs: 80,
        stickDeadZone: 0.5,
        overlayCombo: null,
      }),
    });

    gamepadListener!("DPAD_DOWN", "down");
    vi.advanceTimersByTime(1000);
    expect(intents).toHaveLength(0);

    source.dispose();
    vi.useRealTimers();
  });

  it("repeats with the configured timings", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, gamepadListener } = createTestSource(intents, {
      getGamepadConfig: () => ({
        navigationEnabled: true,
        buttonIntents: { ...GAMEPAD_BUTTON_INTENTS },
        repeatDelayMs: 100,
        repeatIntervalMs: 50,
        stickDeadZone: 0.5,
        overlayCombo: null,
      }),
    });

    gamepadListener!("DPAD_DOWN", "down");
    vi.advanceTimersByTime(100);
    expect(intents).toHaveLength(2);
    vi.advanceTimersByTime(50);
    expect(intents).toHaveLength(3);

    source.dispose();
    vi.useRealTimers();
  });

  it("keeps the default timings for keyboard holds", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, keyboardListener } = createTestSource(intents, {
      getGamepadConfig: () => ({
        navigationEnabled: true,
        buttonIntents: { ...GAMEPAD_BUTTON_INTENTS },
        repeatDelayMs: 100,
        repeatIntervalMs: 50,
        stickDeadZone: 0.5,
        overlayCombo: null,
      }),
    });

    keyboardListener!("ArrowDown", "down", false);
    vi.advanceTimersByTime(100);
    expect(intents).toHaveLength(1); // gamepad delay must not shorten this
    vi.advanceTimersByTime(300);
    expect(intents).toHaveLength(2);

    source.dispose();
    vi.useRealTimers();
  });

  it("converts stick deflection into held directional intents", () => {
    vi.useFakeTimers();
    const intents: GpIntent[] = [];
    const { source, axisListener } = createTestSource(intents);

    axisListener!(0, 0.8); // beyond the default dead-zone
    expect(intents).toEqual([{ kind: "move", axis: "row", delta: 1 }]);

    vi.advanceTimersByTime(400);
    expect(intents).toHaveLength(2); // keeps repeating while held

    axisListener!(0, 0.1); // back inside the dead-zone
    vi.advanceTimersByTime(1000);
    expect(intents).toHaveLength(2); // movement stops

    source.dispose();
    vi.useRealTimers();
  });

  it("follows the dominant stick axis", () => {
    const intents: GpIntent[] = [];
    const { source, axisListener } = createTestSource(intents);

    axisListener!(0.9, 0.3);
    expect(intents).toEqual([{ kind: "move", axis: "control", delta: 1 }]);

    axisListener!(0.2, -0.9);
    expect(intents).toEqual([
      { kind: "move", axis: "control", delta: 1 },
      { kind: "move", axis: "row", delta: -1 },
    ]);

    source.dispose();
  });

  it("ignores stick deflection inside the dead-zone", () => {
    const intents: GpIntent[] = [];
    const { source, axisListener } = createTestSource(intents);

    axisListener!(0.3, -0.3);
    axisListener!(0.5, 0); // at the dead-zone, not beyond
    expect(intents).toEqual([]);

    source.dispose();
  });

  it("uses the configured dead-zone for the stick", () => {
    const intents: GpIntent[] = [];
    const { source, axisListener } = createTestSource(intents, {
      getGamepadConfig: () => ({
        navigationEnabled: true,
        buttonIntents: { ...GAMEPAD_BUTTON_INTENTS },
        repeatDelayMs: 400,
        repeatIntervalMs: 80,
        stickDeadZone: 0.9,
        overlayCombo: null,
      }),
    });

    axisListener!(0.8, 0);
    expect(intents).toEqual([]);

    axisListener!(0.95, 0);
    expect(intents).toEqual([{ kind: "move", axis: "control", delta: 1 }]);

    source.dispose();
  });

  it("drops stick input while navigation is disabled", () => {
    const intents: GpIntent[] = [];
    const { source, axisListener } = createTestSource(intents, {
      getGamepadConfig: () => ({
        navigationEnabled: false,
        buttonIntents: { ...GAMEPAD_BUTTON_INTENTS },
        repeatDelayMs: 400,
        repeatIntervalMs: 80,
        stickDeadZone: 0.5,
        overlayCombo: null,
      }),
    });

    axisListener!(0, 0.9);
    expect(intents).toEqual([]);

    source.dispose();
  });
}
