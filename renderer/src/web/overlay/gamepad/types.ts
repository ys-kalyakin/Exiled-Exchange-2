import type { InjectionKey } from "vue";

export type GpIntent =
  | { kind: "move"; axis: "row" | "control"; delta: 1 | -1 }
  | { kind: "activate" }
  | { kind: "back" };

/**
 * A navigable overlay window. Intents are dispatched to the scope whose
 * widget is the topmost shown one in the WidgetManager.
 */
export interface GamepadNavScope {
  wmId: number;
  /** Whether the window is currently shown and can receive navigation. */
  canNavigate: () => boolean;
  /** Element to search for `data-gp-row` markers. */
  root: () => HTMLElement | null | undefined;
  /** Back-chain step: close an open popover or the window; true = consumed. */
  requestClose: () => boolean;
}

export interface GamepadScopeRegistry {
  add(scope: GamepadNavScope): () => void;
}

export interface GamepadPopoverRegistry {
  add(close: () => void): () => void;
}

export const gamepadScopeRegistryKey: InjectionKey<GamepadScopeRegistry> =
  Symbol("gamepad-nav-scopes");

export const gamepadPopoverRegistryKey: InjectionKey<GamepadPopoverRegistry> =
  Symbol("gamepad-nav-popovers");
