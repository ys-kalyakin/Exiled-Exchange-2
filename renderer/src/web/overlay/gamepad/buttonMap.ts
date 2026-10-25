import type { GpIntent } from "./types";

/**
 * Hardcoded gamepad button -> navigation intent map.
 * Keys match the `GamepadButton` names from `gamepad-io`.
 * Intentionally not configurable yet (see change design); buttons not
 * listed here are ignored by navigation.
 */
export const GAMEPAD_BUTTON_INTENTS: Record<string, GpIntent> = {
  DPAD_UP: { kind: "move", axis: "row", delta: -1 },
  DPAD_DOWN: { kind: "move", axis: "row", delta: 1 },
  DPAD_LEFT: { kind: "move", axis: "control", delta: -1 },
  DPAD_RIGHT: { kind: "move", axis: "control", delta: 1 },
  A: { kind: "activate" },
  B: { kind: "back" },
};

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

  it("ignores buttons that are not mapped", () => {
    expect(GAMEPAD_BUTTON_INTENTS.RT).toBeUndefined();
    expect(KEYBOARD_KEY_INTENTS.Escape).toBeUndefined();
  });
}
