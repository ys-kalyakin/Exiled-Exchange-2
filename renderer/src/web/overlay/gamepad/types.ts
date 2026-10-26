import type { InjectionKey } from "vue";

/** In-overlay shortcut actions a gamepad button can trigger. */
export type GpAction = "search" | "browser" | "preset" | "section";

export type GpIntent =
  | { kind: "move"; axis: "row" | "control"; delta: 1 | -1 }
  | { kind: "activate" }
  | { kind: "back" }
  | { kind: "action"; action: GpAction };

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
  /**
   * Fork: gamepad support — identity used for focus memory across
   * hide/show (for the price check window, the shown item's type).
   */
  focusKey?: () => string | undefined;
  /**
   * Fork: gamepad support — shortcut action intents (search, browser,
   * preset) handled by the owning window; true = consumed.
   */
  runAction?: (action: GpAction) => boolean;
  /**
   * Fork: gamepad support — derive rows from the DOM for windows without
   * `data-gp-row` markers (visible, enabled controls grouped by their row
   * container). Explicit markers, where present, take precedence.
   */
  synthesizeRows?: boolean;
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
