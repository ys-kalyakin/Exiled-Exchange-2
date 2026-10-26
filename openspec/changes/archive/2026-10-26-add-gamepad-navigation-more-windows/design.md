# Design: Gamepad navigation in the remaining overlay windows

## Context

v1 (`add-gamepad-navigation`) established the pieces this change reuses unchanged: the intent source (gamepad IPC + keyboard → intents, with auto-repeat and the config-driven button map), the `GamepadNavScope` registry wired in `OverlayWindow.vue` (`useGamepadNavigation`), topmost-shown-widget routing via the WidgetManager z-order, the two-level focus engine over `data-gp-row`/`data-gp-section` markers, and the B-button back chain (popover → scope `requestClose` → unpin). Only `PriceCheckWindow.vue` registers a scope today.

All windows live in the single overlay window; the settings window is a `wmZorder: "exclusive"` widget (`SettingsWindow.vue`) that renders one of ~15 page components plus a menu column and Save/Cancel footer. The page components are upstream-shared; editing every page to add markers would scatter fork edits across upstream files. Renderer tests run in a node environment without jsdom (fake DOM stubs, see existing `focusEngine.ts` tests), so new DOM logic must stay unit-testable against narrow interfaces.

## Goals / Non-Goals

Goals:

- Every overlay window that contains controls is navigable from the pad, with the price check behavior byte-for-byte unchanged.
- The settings window becomes navigable without per-page edits to upstream components.
- Unit-testable focus-engine logic, matching the existing test style.

Non-Goals:

- Text entry (on-screen keyboard) — activation focuses text inputs for a physical keyboard, as today.
- Section jump targets (`data-gp-section`) in the new windows; the RB section action simply finds no sections there and does nothing.
- Any main-process, config-schema, or shortcut-hotkeys change.
- Visual redesign of the focus indicator.

## Decisions

### D1: Per-window scope registration, not a Widget.vue-level catch-all

Each new window registers its own `useGamepadNavScope` (root, `canNavigate`, `requestClose`). A generic scope inside the shared `Widget.vue` wrapper was considered and rejected: price check already registers its own richer scope (focus key, shortcut actions), the two would collide for the same `wmId`, and per-window close semantics differ (see D4). Registration is a few lines per window.

Scope registrations:

| Window | Root | `canNavigate` | `requestClose` |
| --- | --- | --- | --- |
| Settings | the settings window element | widget shown | the existing Cancel/close handler |
| Item-check (map check / item info) | the widget's content element | widget shown | `wm.hide(wmId)` when shown |
| Widget menu | the menu content element | menu shown | none (returns false) |
| Item search, stash search, notepad, stopwatch, library, image strip | the widget content element | widget shown | `wm.hide(wmId)` when shown |

Roots point at the whole widget element, so the widget header buttons (close/edit/move) form ordinary rows and A can activate them. Delve grid is skipped (it renders no controls at all).

### D2: Opt-in DOM-derived row synthesis in the focus engine

Scopes get an optional `synthesizeRows: true` flag. When set and the scope's root contains no `data-gp-row` elements, the engine derives rows from the DOM: collect visible, enabled controls (`CONTROL_SELECTOR`), then group them by row container — starting from each control, climb ancestors while the ancestor contains exactly one control; the first ancestor containing two or more controls is the row container, and every visible enabled control inside it belongs to that row. Rows are ordered by document position. Controls whose row container is outside the root are dropped.

- Why this rule: settings pages wrap each setting in its own container (label + control(s) share a wrapper), so it yields one row per setting, in document order, with zero markers. Map check works the same way (cycle + seen buttons share the stat row container; profile buttons share their header row).
- Explicit `data-gp-row` markers take precedence: marked elements are used as rows as-is; only marker-free regions are synthesized. For v1 of this change the practical rule is "if the root has any markers, use markers only" — implemented as: synthesis applies when the root contains no `data-gp-row`, matching the spec's precedence wording without a mixed-mode grouping algorithm.
- Escape hatch: if a page degrades to one giant row (everything in one container), that page can add explicit `data-gp-row` markers later — a one-attribute edit, no engine change.
- Alternative rejected: a virtual cursor (free 2D movement) — explicitly deferred by the roadmap (Phase 4) and a much larger behavior change.

### D3: Scroll the focused control into view

`applyFocusVisual` calls `scrollIntoView({ block: "nearest" })` on the newly focused control (and only then). `nearest` keeps already-visible controls perfectly still, so the price check window is visually unaffected. The overlay page itself does not scroll, so ancestors beyond the window's own overflow containers are not moved.

### D4: Close semantics per window

The back chain is unchanged; new windows implement `requestClose` to mirror their own close control:

- Item-check and the simple widgets: hide the widget via the WidgetManager (`wm.hide`), same as the header close button, returning `true` (consumed) only when the widget was shown. The overlay stays pinned.
- Settings: invoke the existing Cancel path (the title bar close is Cancel today), discarding unsaved edits exactly as the mouse flow does.
- Widget menu: `requestClose` returns `false` — the menu has no close control (`hideable: false`), so B falls through to unpinning the overlay. Popovers inside the menu (the add-widget list) still close first via the existing popover registry.

### D5: Capture suppression via a renderer-local flag

`GamepadComboInput` already receives every raw button while main's capture mode is on; the interference is renderer-side: navigation intents would fire while the user records a combo. Add a tiny module-level capture flag in `renderer/src/web/overlay/gamepad/` (set/clear API). `GamepadComboInput.toggleCapture`/`stop` sets and clears it (its `stop()` already runs on commit, cancel, timeout, and unmount, so the flag cannot leak). The intent source checks the flag for gamepad-originated events only — keyboard navigation keeps working, satisfying the spec's asymmetry. A renderer-local flag avoids new IPC: main's own `gamepadCapture` flag already exists for its combo-filtering purpose and stays as is.

### D6: Testability without jsdom

The synthesis and scroll decisions live in pure functions over a narrow DOM surface (parent chain, `getClientRects`, class lists — the same stub pattern the existing tests use). Scroll-into-view is called through an injectable so tests assert the call instead of real scrolling.

## Risks / Trade-offs

- [A page wrapped in one big container degrades to a single row] → escape hatch: explicit `data-gp-row` markers in that page (precedence per spec); verify the real settings pages during implementation and add markers where needed.
- [`scrollIntoView` moving an unexpected ancestor] → `block: "nearest"` plus the overlay having no page-level scroll; verify on the settings pane during implementation.
- [Capture flag leaks if a future input forgets to clear it] → all clear paths funnel through the existing `stop()`; the flag is also re-cleared on capture start.
- [Synthesis picks odd rows in unusual widgets] → worst case is a coarser/finer row grouping, never a crash; markers can correct any window.
- [Upstream merges re-arranging settings/widget markup] → no behavior encoded in upstream file layout beyond generic container structure; the roadmap's standing note to re-check `data-gp-*` attributes after merges extends to the new registrations.

## Migration Plan

No config, data, or IPC changes; a renderer-only change shipped with the fork's normal build. Rollback is a revert of the implementation commit. The upstream-merge burden is the few registration lines in shared components plus the fork-owned gamepad module changes.

## Open Questions

None. The two judgment calls (B = Cancel on settings; the widget menu not B-closable) are recorded in the spec and follow from the "close like its own close control" rule.
