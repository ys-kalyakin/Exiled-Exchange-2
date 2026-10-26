# Tasks

## 1. Focus engine: DOM-derived rows and scrolling

- [x] 1.1 Add `synthesizeRows` to `GamepadNavScope` (`overlay/gamepad/types.ts`) and implement the row-synthesis function in `overlay/gamepad/focusEngine.ts` (group visible enabled controls by row container: climb ancestors while an ancestor holds exactly one control; first ancestor with two or more controls is the row; skip controls whose row container is outside the root). Unit-test grouping, document order, visibility/disabled filtering, marker precedence, and the outside-root skip against fake DOM stubs; run `cd renderer && npm run test`.
- [x] 1.2 Route `collectRows` through synthesis in `overlay/gamepad/navigation.ts` for scopes with `synthesizeRows` when the root has no `data-gp-row` elements, keeping marker-driven behavior untouched otherwise. Unit-test both paths with the existing harness; run `cd renderer && npm run test`.
- [x] 1.3 Call `scrollIntoView({ block: "nearest" })` on the newly focused control in `applyFocusVisual` behind an injectable, and unit-test that movement into an off-viewport row triggers the call while already-visible focus does not; run `cd renderer && npm run test`.

## 2. Capture suppression

- [x] 2.1 Add the renderer-local capture flag to `overlay/gamepad/` (set/clear API) and make the intent source drop gamepad-originated intents while it is armed, keeping keyboard intents flowing; unit-test both the suppression and the keyboard asymmetry; run `cd renderer && npm run test`.
- [x] 2.2 Set/clear the flag from `GamepadComboInput.vue` capture start and its existing `stop()` (commit, cancel, timeout, unmount). Verify by arming a capture in the settings window with the dev app: d-pad presses record into the combo and do not move focus, and navigation resumes after commit; run `cd renderer && npm run lint && npm run check-types`.

## 3. Settings window scope

- [x] 3.1 Register the settings window scope in `settings/SettingsWindow.vue` (`synthesizeRows`, root = window element, `canNavigate` = widget shown, `requestClose` = existing Cancel/close handler). Verify in the dev app: d-pad navigates menu column, page controls and Save/Cancel; A toggles a checkbox and steps a select; focused controls scroll into view in the page pane; B cancels the window; run `cd renderer && npm run test && npm run check-types`.
- [x] 3.2 Check the rendered settings pages for degenerate grouping (a whole page collapsing into one row) and add explicit `data-gp-row` markers only to such spots. Verify each settings page is navigable row-by-row in the dev app.

## 4. Item-check, widget menu, and remaining widgets

- [x] 4.1 Register the item-check scope in `item-check/WidgetItemCheck.vue` (`synthesizeRows`, root = widget content, `requestClose` = `wm.hide` when shown). Verify in the dev app with a map and a non-map item: stat rows and profile buttons focus and A cycles the decision; B hides the widget; run `cd renderer && npm run test && npm run check-types`.
- [x] 4.2 Register the widget menu scope in `overlay/WidgetMenu.vue` (`synthesizeRows`, root = menu content, `requestClose` = none). Verify in the dev app: widget toggle buttons focus and A toggles a widget; B closes the add-widget popover first, then unpins the overlay with the menu still shown; run `cd renderer && npm run check-types`.
- [x] 4.3 Register scopes for item search, stash search, notepad, stopwatch, library, and image strip with the shared `wm.hide` close semantics. Verify each in the dev app: focus moves over its controls and B hides the widget; run `cd renderer && npm run test && npm run check-types`.

## 5. Regression and full verification

- [x] 5.1 Re-verify the price check window against the existing v1 scenarios (two-level movement, lazy entry, focus memory per item type, popover-aware B chain, X/Y/LB/RB actions) in the dev app, confirming no visual or behavioral change from synthesis and scrolling.
- [x] 5.2 Run the full check suite: `cd renderer && npm run lint && npm run check-types && npm run test` and `cd main && npm run lint && npm run check-types` (main must be untouched — a clean run confirms it), plus `pre-commit run --all-files`.
- [x] 5.3 Manual gamepad pass on KDE Plasma 6 Wayland with the 8BitDo pad: settings, map check, widget menu and one simple widget navigated from the pad, including a combo capture round-trip; note any X11/Windows follow-ups in the roadmap document (`docs/gamepad-roadmap.md` Phase 3 status).

## Workflow follow-up

- Update `docs/gamepad-roadmap.md` (Phase 3 marked shipped) and archive the change via `/opsx:archive` after review, syncing the delta into `openspec/specs/gamepad-navigation/spec.md`.
