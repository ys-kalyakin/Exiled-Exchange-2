import {
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  watch,
} from "vue";
import { Host } from "@/web/background/IPC";
import type { Widget, WidgetManager } from "../interfaces";
import { createIntentSource } from "./intents";
import {
  activateControl,
  applyFocusVisual,
  clampIndex,
  clearFocusVisual,
  collectControls,
  collectRows,
  initialFocusState,
  stepSelect,
} from "./focusEngine";
import type {
  GamepadNavScope,
  GamepadPopoverRegistry,
  GamepadScopeRegistry,
  GpIntent,
} from "./types";
import {
  gamepadPopoverRegistryKey,
  gamepadScopeRegistryKey,
} from "./types";

/**
 * Wires gamepad (and keyboard) navigation into the overlay window:
 * intent source -> topmost registered scope -> two-level focus movement,
 * activation and the B-button back chain (popover -> window -> unpin).
 */
export function useGamepadNavigation(wm: WidgetManager) {
  const scopes = shallowRef<GamepadNavScope[]>([]);
  const popoverClosers: Array<() => void> = [];

  provide<GamepadScopeRegistry>(gamepadScopeRegistryKey, {
    add(scope) {
      scopes.value = [...scopes.value, scope];
      return () => {
        scopes.value = scopes.value.filter((s) => s !== scope);
      };
    },
  });

  provide<GamepadPopoverRegistry>(gamepadPopoverRegistryKey, {
    add(close) {
      popoverClosers.push(close);
      return () => {
        const index = popoverClosers.indexOf(close);
        if (index !== -1) popoverClosers.splice(index, 1);
      };
    },
  });

  /** The topmost shown widget must itself be a registered scope. */
  function topScope(): GamepadNavScope | undefined {
    const shownWidgets = wm.widgets.value.filter((w) => w.wmWants === "show");
    if (!shownWidgets.length) return undefined;
    const zorder = (w: Widget) =>
      typeof w.wmZorder === "number"
        ? w.wmZorder
        : w.wmZorder === "exclusive"
          ? Number.MAX_SAFE_INTEGER
          : -1;
    const topmost = shownWidgets.reduce((top, w) =>
      zorder(w) > zorder(top) ? w : top,
    );
    return scopes.value.find(
      (s) => s.wmId === topmost.wmId && s.canNavigate(),
    );
  }

  let focusState = initialFocusState();
  let focusWmId: number | null = null;

  function resetFocusFor(scope: GamepadNavScope) {
    if (focusWmId === scope.wmId) return;
    if (focusWmId !== null) {
      const previous = scopes.value.find((s) => s.wmId === focusWmId);
      const previousRoot = previous?.root();
      if (previousRoot) clearFocusVisual(previousRoot);
    }
    focusState = initialFocusState();
    focusWmId = scope.wmId;
  }

  function dispatch(intent: GpIntent) {
    if (intent.kind === "back") {
      handleBack();
      return;
    }

    const scope = topScope();
    if (!scope) return;
    const root = scope.root();
    if (!root) return;
    resetFocusFor(scope);

    if (intent.kind === "activate") {
      if (!focusState.engaged) return;
      const focused = applyFocusVisual(root, focusState);
      if (focused) activateControl(focused.control);
      return;
    }

    const rows = collectRows(root);
    if (!rows.length) {
      focusState = { ...focusState, engaged: false };
      clearFocusVisual(root);
      return;
    }

    if (!focusState.engaged) {
      // lazy entry: the first directional press places focus, no movement
      focusState = { engaged: true, rowIndex: 0, controlIndex: 0 };
      applyFocusVisual(root, focusState);
      return;
    }

    const rowIndex = Math.min(focusState.rowIndex, rows.length - 1);
    const controls = collectControls(rows[rowIndex]);
    const controlIndex = Math.min(
      focusState.controlIndex,
      Math.max(controls.length - 1, 0),
    );
    const current = controls[controlIndex];

    if (intent.axis === "control" && current instanceof HTMLSelectElement) {
      stepSelect(current, intent.delta);
      return;
    }

    if (intent.axis === "row") {
      focusState = {
        engaged: true,
        rowIndex: clampIndex(rowIndex + intent.delta, rows.length),
        controlIndex,
      };
    } else {
      focusState = {
        engaged: true,
        rowIndex,
        controlIndex: clampIndex(controlIndex + intent.delta, controls.length),
      };
    }
    applyFocusVisual(root, focusState);
  }

  function handleBack() {
    // the topmost open popover closes first
    if (popoverClosers.length) {
      popoverClosers[popoverClosers.length - 1]();
      return;
    }
    const scope = topScope();
    if (scope?.requestClose()) return;
    if (Host.isElectron) {
      Host.sendEvent({
        name: "OVERLAY->MAIN::focus-game",
        payload: undefined,
      });
    }
  }

  const source = createIntentSource({ onIntent: dispatch });
  onBeforeUnmount(() => source.dispose());

  // drop focus visuals and state when the focused window hides, so a stale
  // ring does not reappear on its next show (widget DOM persists via v-show)
  watch(
    () => wm.widgets.value.map((w) => `${w.wmId}:${w.wmWants}`).join(","),
    () => {
      if (focusWmId === null) return;
      const widget = wm.widgets.value.find((w) => w.wmId === focusWmId);
      if (widget && widget.wmWants !== "show") {
        const scope = scopes.value.find((s) => s.wmId === focusWmId);
        const root = scope?.root();
        if (root) clearFocusVisual(root);
        focusState = initialFocusState();
        focusWmId = null;
      }
    },
  );

  return {
    dispose: () => source.dispose(),
  };
}

/** Registers the calling window as a navigable scope. */
export function useGamepadNavScope(scope: GamepadNavScope) {
  const registry = inject(gamepadScopeRegistryKey, null);
  if (!registry) return;
  let remove: (() => void) | undefined;
  onMounted(() => {
    remove = registry.add(scope);
  });
  onBeforeUnmount(() => remove?.());
}
