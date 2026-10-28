import { GAMEPAD_BUTTONS, GAMEPAD_BUTTON_INTENTS } from "./buttonMap";
import type { GamepadConfig } from "./config";
import type { GpIntentSource } from "./types";

export interface HintChip {
  /** Stable rendering key: the button name, or a synthetic keyboard id. */
  id: string;
  /** Keycap text shown in the bar (the button or key name). */
  key: string;
  /** Label key relative to the `settings.gamepad` i18n namespace. */
  labelKey: string;
}

/**
 * Fork: gamepad support — builds the input hint bar chips for the given
 * input mode. Gamepad mode starts with the movement chip (d-pad / left
 * stick, always available while navigation is enabled — the stick cannot be
 * unmapped), then lists each mapped non-movement button in the stable
 * display order, skipping buttons assigned none, so the bar always reflects
 * the configured assignments. Keyboard mode shows the fixed arrow/Enter
 * chips; the bindings are fixed, so there is nothing to configure.
 */
export function hintChips(
  mode: GpIntentSource,
  gamepad: Pick<GamepadConfig, "buttonIntents"> | undefined,
): HintChip[] {
  if (mode === "keyboard") {
    return [
      { id: "kb-arrows", key: "←↑↓→", labelKey: "hints.keyboard_move" },
      { id: "kb-enter", key: "Enter", labelKey: "hints.keyboard_activate" },
    ];
  }

  const chips: HintChip[] = [
    { id: "gp-move", key: "D-Pad / LS", labelKey: "hints.move" },
  ];
  const intents = gamepad?.buttonIntents ?? GAMEPAD_BUTTON_INTENTS;
  for (const button of GAMEPAD_BUTTONS) {
    const intent = intents[button] ?? GAMEPAD_BUTTON_INTENTS[button];
    if (!intent || intent === "unmapped" || intent.kind === "move") continue;
    const labelKey =
      intent.kind === "action" ? `intent.${intent.action}` : `intent.${intent.kind}`;
    chips.push({ id: button, key: button, labelKey });
  }
  return chips;
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("builds the default gamepad chips in the display order", () => {
    const chips = hintChips("gamepad", undefined);

    expect(chips[0]).toEqual({
      id: "gp-move",
      key: "D-Pad / LS",
      labelKey: "hints.move",
    });
    expect(chips.slice(1).map((c) => c.id)).toEqual([
      "A",
      "B",
      "X",
      "Y",
      "LB",
      "RB",
    ]);
    expect(chips.map((c) => c.labelKey)).toEqual([
      "hints.move",
      "intent.activate",
      "intent.back",
      "intent.search",
      "intent.browser",
      "intent.preset",
      "intent.section",
    ]);
  });

  it("reflects a remapped button and skips unmapped ones", () => {
    const chips = hintChips("gamepad", {
      buttonIntents: {
        ...GAMEPAD_BUTTON_INTENTS,
        X: { kind: "action", action: "preset" },
        B: "unmapped",
      },
    });

    const x = chips.find((c) => c.id === "X");
    expect(x).toEqual({ id: "X", key: "X", labelKey: "intent.preset" });
    expect(chips.find((c) => c.id === "B")).toBeUndefined();
    expect(chips.find((c) => c.id === "RT")).toBeUndefined();
  });

  it("keeps keyboard chips fixed regardless of configuration", () => {
    expect(hintChips("keyboard", undefined)).toEqual([
      { id: "kb-arrows", key: "←↑↓→", labelKey: "hints.keyboard_move" },
      { id: "kb-enter", key: "Enter", labelKey: "hints.keyboard_activate" },
    ]);
  });
}
