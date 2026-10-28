# Proposal

## Why

Gamepad navigation in the overlay already covers the full control set (d-pad/stick focus movement, A/B/X/Y/LB/RB actions, back chain), but nothing in the UI tells a gamepad user what the buttons do — the mapping lives only in settings and docs. Users must memorize it before the first session becomes usable. An input-adaptive hint bar closes this discoverability gap at the moment input happens, without permanently cluttering the window for mouse and keyboard users.

## What Changes

- Add a renderer-side input-mode tracker: the navigation intent layer reports the source (gamepad vs keyboard) of every dispatched intent, and the most recent source is exposed to UI components.
- Add a hint bar to the price check window that:
  - stays hidden while no navigation intent has been produced since the window was last shown;
  - appears on the first intent and shows the button assignments of that intent's source;
  - shows gamepad chips built from the configured `gamepad.buttonIntents`, so remapped assignments are always reflected;
  - shows keyboard hints (arrows + Enter) when the most recent intent came from the keyboard;
  - switches live when the source changes and stays visible until the window hides.
- Add the needed i18n strings inside the existing fork-owned `settings.gamepad` namespace (English only, consistent with the current gamepad i18n).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `gamepad-navigation`: adds a requirement for the adaptive input-source hint bar in the price check window. No existing requirement changes — movement, activation, back chain and action intents behave exactly as today.

## Impact

- Renderer only:
  - `renderer/src/web/overlay/gamepad/intents.ts` — the intent source passes its origin (gamepad/axis/keyboard) along with dispatched intents;
  - `renderer/src/web/overlay/gamepad/navigation.ts` — records the latest source in the new tracker;
  - new `renderer/src/web/overlay/gamepad/inputMode.ts` — tiny tracker module (sibling of `capture.ts`);
  - new hint-bar component in the fork-owned gamepad module, mounted by the price check window;
  - `renderer/src/web/price-check/PriceCheckWindow.vue` — one localized insertion (import + template tag);
  - `renderer/public/data/en/app_i18n.json` — new keys under the fork-owned `settings.gamepad` subtree.
- Upstream mergeability: all new files live in the fork-only `overlay/gamepad/` directory. The two upstream-shared files touched (`PriceCheckWindow.vue`, `en/app_i18n.json`) get minimal, localized fork edits — the same pattern the fork already uses there (`runAction` hook, `settings.gamepad` keys).
- Gamepad feature: this is a gamepad UX enhancement; combos, main-process forwarding and focus-engine movement semantics are unchanged. No main-process changes at all.
- Linux (X11 / KDE Wayland): renderer-only change, no platform-specific code affected.
- No new dependencies; no config schema change (`gamepad.buttonIntents` is consumed read-only; `configVersion` untouched).

Out of scope: hint bars in other navigable windows (settings, map check), a SELECT-toggled full legend, timed fade or first-run onboarding variants, and any text-input solution.
