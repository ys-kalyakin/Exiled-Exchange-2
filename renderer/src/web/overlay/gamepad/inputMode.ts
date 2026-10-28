import { ref } from "vue";
import type { GpIntentSource } from "./types";

/**
 * Fork: gamepad support — the navigation input mode UI hints react to.
 * Written by the intent wiring on every dispatched intent ("gamepad" for
 * buttons and the stick, "keyboard" for arrows/Enter); read by hint
 * components. A snapshot object rather than a bare string so every intent
 * re-triggers watchers even when the mode is unchanged — windows re-arm
 * their hints per show, and a same-value write would stay silent. null
 * until the first intent of the renderer session.
 */
export const inputMode = ref<{ mode: GpIntentSource } | null>(null);
