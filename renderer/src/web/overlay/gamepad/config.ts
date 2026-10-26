import { GAMEPAD_BUTTONS, GAMEPAD_BUTTON_INTENTS } from "./buttonMap";
import type { GpIntent } from "./types";

/**
 * Fork: gamepad support — shape of the `gamepad` config section and the
 * migration slice filling it for configs saved by older versions.
 */
export interface GamepadConfig {
  navigationEnabled: boolean;
  buttonIntents: Record<string, GpIntent | "unmapped">;
  repeatDelayMs: number;
  repeatIntervalMs: number;
  stickDeadZone: number;
  /** Gamepad combo toggling the overlay, extending the `overlayKey` hotkey. */
  overlayCombo: string | null;
}

export const defaultGamepadConfig = (): GamepadConfig => ({
  navigationEnabled: true,
  buttonIntents: Object.fromEntries(
    GAMEPAD_BUTTONS.map((button) => [
      button,
      (GAMEPAD_BUTTON_INTENTS[button] ?? "unmapped") as GpIntent | "unmapped",
    ]),
  ),
  repeatDelayMs: 400,
  repeatIntervalMs: 80,
  stickDeadZone: 0.5,
  overlayCombo: null,
});

/**
 * Fills the `gamepad` section and the per-widget gamepad combo fields with
 * defaults when they are missing (called from the configVersion 36 rung of
 * `upgradeConfig` in `renderer/src/web/Config.ts`). Existing values are kept.
 */
export function upgradeGamepadConfig(config: {
  gamepad?: GamepadConfig;
  widgets: Array<Record<string, unknown>>;
}): void {
  if (!config.gamepad) {
    config.gamepad = defaultGamepadConfig();
  }

  const priceCheck = config.widgets.find((w) => w.wmType === "price-check") as
    | Record<string, unknown>
    | undefined;
  if (priceCheck && priceCheck.gamepadHotkey === undefined) {
    priceCheck.gamepadHotkey = "R3 + RT";
  }
  if (priceCheck && priceCheck.gamepadHotkeyLocked === undefined) {
    priceCheck.gamepadHotkeyLocked = "L3 + RT";
  }

  for (const wmType of ["item-check", "delve-grid"]) {
    const widget = config.widgets.find((w) => w.wmType === wmType) as
      | Record<string, unknown>
      | undefined;
    if (widget && widget.gamepadHotkey === undefined) {
      widget.gamepadHotkey = null;
    }
  }
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("defaults carry the full button map and timings", () => {
    const gamepad = defaultGamepadConfig();
    expect(gamepad.navigationEnabled).toBe(true);
    expect(gamepad.repeatDelayMs).toBe(400);
    expect(gamepad.repeatIntervalMs).toBe(80);
    expect(gamepad.stickDeadZone).toBe(0.5);
    expect(gamepad.overlayCombo).toBeNull();
    expect(gamepad.buttonIntents.DPAD_DOWN).toEqual({
      kind: "move",
      axis: "row",
      delta: 1,
    });
    expect(gamepad.buttonIntents.A).toEqual({ kind: "activate" });
    expect(gamepad.buttonIntents.B).toEqual({ kind: "back" });
    expect(gamepad.buttonIntents.X).toEqual({
      kind: "action",
      action: "search",
    });
    expect(gamepad.buttonIntents.Y).toEqual({
      kind: "action",
      action: "browser",
    });
    expect(gamepad.buttonIntents.LB).toEqual({
      kind: "action",
      action: "preset",
    });
    expect(gamepad.buttonIntents.RB).toEqual({
      kind: "action",
      action: "section",
    });
    expect(gamepad.buttonIntents.RT).toBe("unmapped");
  });

  it("migration fills the gamepad section and combo fields, keeping other settings", () => {
    const config: {
      gamepad?: GamepadConfig;
      widgets: Array<Record<string, unknown>>;
    } = {
      gamepad: undefined,
      widgets: [
        { wmType: "price-check", apiLatencySeconds: 5 },
        { wmType: "item-check", hotkey: "Q" },
        { wmType: "delve-grid", toggleKey: null },
        { wmType: "notepad" },
      ],
    };

    upgradeGamepadConfig(config);

    expect(config.gamepad!.repeatDelayMs).toBe(400);
    expect(config.gamepad!.buttonIntents.X).toEqual({
      kind: "action",
      action: "search",
    });
    expect(config.widgets[0].gamepadHotkey).toBe("R3 + RT");
    expect(config.widgets[0].gamepadHotkeyLocked).toBe("L3 + RT");
    expect(config.widgets[0].apiLatencySeconds).toBe(5);
    expect(config.widgets[1].gamepadHotkey).toBeNull();
    expect(config.widgets[1].hotkey).toBe("Q");
    expect(config.widgets[2].gamepadHotkey).toBeNull();
  });

  it("migration keeps existing values", () => {
    const config: {
      gamepad?: GamepadConfig;
      widgets: Array<Record<string, unknown>>;
    } = {
      gamepad: defaultGamepadConfig(),
      widgets: [{ wmType: "price-check", gamepadHotkey: "R3 + LT" }],
    };

    upgradeGamepadConfig(config);

    expect(config.widgets[0].gamepadHotkey).toBe("R3 + LT");
    expect(config.widgets[0].gamepadHotkeyLocked).toBe("L3 + RT");
  });
}
