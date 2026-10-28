# Design

## Context

The fork's gamepad navigation pipeline is: raw events → `createIntentSource` (`renderer/src/web/overlay/gamepad/intents.ts`, framework-free, three subscription points: gamepad buttons, stick axes, keyboard) → `onIntent` → dispatcher in `navigation.ts` (the only caller, created at line ~327) → focus engine / window scopes. Existing fork patterns this change reuses: module-singleton state (`capture.ts`, plain variables), config-driven button map (`gamepad.buttonIntents` in `GamepadConfig`), localized intent labels (`settings.gamepad.intent.*`, English-only under the fork-owned `settings.gamepad` i18n subtree), and the keycap hint row style already used by `app.toggle_browser_hint` in `PriceCheckWindow.vue`.

See proposal.md for motivation and the delta spec for the behavior contract.

## Goals / Non-Goals

**Goals:**
- One global "last input source" state, written only by the intent pipeline, read by UI.
- Hint chips derived from `gamepad.buttonIntents` so remapping is always reflected.
- Minimal diff in upstream-shared files; all new code in the fork-owned `overlay/gamepad/` directory.
- The appearing bar must not reflow the navigable content of the price check window.

**Non-Goals:**
- No fade/timeout behavior, no first-run onboarding copy, no per-window hint bars beyond price check in this change.
- No new config fields, no `configVersion` bump, no main-process changes, no new dependencies.
- No change to which intents are dispatched or to focus-engine semantics.

## Decisions

1. **Tracker = module-level Vue `ref` in a new `overlay/gamepad/inputMode.ts`.**
   `export const inputMode = ref<'gamepad' | 'keyboard' | null>(null)`.
   Alternatives: a plain-module singleton like `capture.ts` — rejected because the only consumer is a Vue component and a ref is the smallest reactive primitive; an event emitter — overkill for one value. The mode persists across window show/hide for the whole renderer session; visibility resetting is the component's concern (Decision 5).

2. **Intent source contract gains a source parameter: `onIntent(intent, source)`.**
   The three subscription points pass `'gamepad'` (buttons), `'gamepad'` (stick axes — stick input is gamepad input by definition), `'keyboard'`. Unmapped buttons, disabled navigation and capture mode return before `onIntent`, so the mode only changes on intents that actually dispatched — matching the spec ("dispatched intent"). Alternatives: a separate `onSource` callback — two wiring points for no benefit; inferring the source in the dispatcher — impossible, the dispatcher never sees raw input.
   `navigation.ts` keeps `intents.ts` framework-free by writing the ref in its `onIntent` handler.

3. **Component: `InputHints.vue` in `overlay/gamepad/`, mounted by `PriceCheckWindow.vue`.**
   Props: the app config (to read `gamepad.buttonIntents`). Component-local state resets when the window hides, so a re-shown window starts hidden (if the window component unmounts on hide this is free; otherwise a watcher on the shown flag). Alternative — global visibility in `inputMode.ts` — rejected: visibility is per-window (spec), mode is global; mixing them would break the second navigable window that adopts the bar later.

4. **Chips are computed from config; movement is a single always-present chip.**
   Order follows `GAMEPAD_BUTTONS`; each mapped non-movement button renders a keycap chip with its `settings.gamepad.intent.*` label; `unmapped` buttons are skipped. The movement chip (d-pad / left stick) is always shown: the stick cannot be unmapped through the config UI, so movement is always available while navigation is enabled. Keyboard mode renders fixed chips (arrows, Enter) with new i18n keys. Reuses the `toggle_browser_hint` keycap styling (`bg-gray-400 text-gray-900 rounded px-1`).

5. **The bar is absolutely positioned (overlay strip), not a layout participant.**
   If appearing shifted the filter rows, the first directional press would move every row under the user's focus — precisely at the moment they start navigating. Rendering the bar as a floating strip at the bottom edge of the window keeps the navigable DOM stable. Alternatives: reserving a fixed-height footer slot — wastes space for mouse-only users; placing it inside the existing hint slot next to `toggle_browser_hint` — that slot only exists in browser mode and is part of the flow layout.

6. **i18n keys under `settings.gamepad.hints` (en only).**
   New keys: `move` (movement chip), `keyboard_move`, `keyboard_activate`. Action labels reuse the existing `settings.gamepad.intent.*` keys, guaranteeing the bar and the settings page never disagree. Other locales stay untouched (fallback to English is the established fork behavior).

## Risks / Trade-offs

- [Upstream merge conflict in `PriceCheckWindow.vue`] → the edit is one import plus one template tag, localized to the window root — the same minimal-insertion pattern the fork already maintains there (`runAction`, `gamepadHotkey` fields). Conflicts, if any, resolve trivially.
- [Floating strip overlaps window content on short windows] → the bar sits at the window's bottom edge with compact single-row styling; price check's bottom area is the end of the filter list, and the strip is small. If it ever obscures the Search row, z-order and offset are trivial to adjust.
- [Mode flapping between sources] → only an actual dispatched intent switches the mode; accidental unmapped presses cannot toggle it. Stick jitter produces real movement intents, so switching on stick deflection is correct behavior, not flapping.
- [Bar visible during combo capture] → capture mutes intent dispatch, so the mode cannot change while recording; a bar already visible simply stays. No special casing.

## Migration Plan

None needed: no persisted state, no config schema change. Rollback is a plain revert; the tracker module and component have no external consumers beyond the price check window.

## Open Questions

None that affect the approach or task breakdown; exact English wording of the three new hint strings can be settled during implementation.
