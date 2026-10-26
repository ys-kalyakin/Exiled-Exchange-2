import type { GpIntent } from "./types";

/**
 * Default gamepad button -> navigation intent map. Used as the defaults
 * source for the `gamepad` config section (see `defaultConfig` in
 * `renderer/src/web/Config.ts`); dispatch-time lookup goes through the
 * config, not this constant.
 * Keys match the `GamepadButton` names from `gamepad-io`.
 */
export const GAMEPAD_BUTTON_INTENTS: Record<string, GpIntent> = {
  DPAD_UP: { kind: "move", axis: "row", delta: -1 },
  DPAD_DOWN: { kind: "move", axis: "row", delta: 1 },
  DPAD_LEFT: { kind: "move", axis: "control", delta: -1 },
  DPAD_RIGHT: { kind: "move", axis: "control", delta: 1 },
  A: { kind: "activate" },
  B: { kind: "back" },
  X: { kind: "action", action: "search" },
  Y: { kind: "action", action: "browser" },
  LB: { kind: "action", action: "preset" },
  RB: { kind: "action", action: "section" },
};

/** Every button of the `gamepad-io` Pro 2 profile, in a stable display order. */
export const GAMEPAD_BUTTONS = [
  "DPAD_UP",
  "DPAD_DOWN",
  "DPAD_LEFT",
  "DPAD_RIGHT",
  "A",
  "B",
  "X",
  "Y",
  "LB",
  "RB",
  "LT",
  "RT",
  "L3",
  "R3",
  "SELECT",
  "START",
] as const;

/** Keyboard equivalents, fed into the same intent stream as the gamepad. */
export const KEYBOARD_KEY_INTENTS: Record<string, GpIntent> = {
  ArrowUp: { kind: "move", axis: "row", delta: -1 },
  ArrowDown: { kind: "move", axis: "row", delta: 1 },
  ArrowLeft: { kind: "move", axis: "control", delta: -1 },
  ArrowRight: { kind: "move", axis: "control", delta: 1 },
  Enter: { kind: "activate" },
};

export function isDirectional(intent: GpIntent): boolean {
  return intent.kind === "move";
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("maps dpad directions to two-level movement", () => {
    expect(GAMEPAD_BUTTON_INTENTS.DPAD_DOWN).toEqual({
      kind: "move",
      axis: "row",
      delta: 1,
    });
    expect(GAMEPAD_BUTTON_INTENTS.DPAD_LEFT).toEqual({
      kind: "move",
      axis: "control",
      delta: -1,
    });
  });

  it("maps keyboard arrows to the same intents as the gamepad", () => {
    expect(KEYBOARD_KEY_INTENTS.ArrowDown).toEqual(
      GAMEPAD_BUTTON_INTENTS.DPAD_DOWN,
    );
    expect(KEYBOARD_KEY_INTENTS.ArrowUp).toEqual(
      GAMEPAD_BUTTON_INTENTS.DPAD_UP,
    );
    expect(KEYBOARD_KEY_INTENTS.Enter).toEqual(GAMEPAD_BUTTON_INTENTS.A);
  });

  it("activates and navigates back with A and B", () => {
    expect(GAMEPAD_BUTTON_INTENTS.A).toEqual({ kind: "activate" });
    expect(GAMEPAD_BUTTON_INTENTS.B).toEqual({ kind: "back" });
  });

  it("assigns the shortcut buttons their default actions", () => {
    expect(GAMEPAD_BUTTON_INTENTS.X).toEqual({
      kind: "action",
      action: "search",
    });
    expect(GAMEPAD_BUTTON_INTENTS.Y).toEqual({
      kind: "action",
      action: "browser",
    });
    expect(GAMEPAD_BUTTON_INTENTS.LB).toEqual({
      kind: "action",
      action: "preset",
    });
    expect(GAMEPAD_BUTTON_INTENTS.RB).toEqual({
      kind: "action",
      action: "section",
    });
  });

  it("lists every mapped button in the display order", () => {
    expect(GAMEPAD_BUTTONS).toEqual(
      expect.arrayContaining(Object.keys(GAMEPAD_BUTTON_INTENTS)),
    );
  });

  it("ignores buttons that are not mapped", () => {
    expect(GAMEPAD_BUTTON_INTENTS.RT).toBeUndefined();
    expect(KEYBOARD_KEY_INTENTS.Escape).toBeUndefined();
  });
}
