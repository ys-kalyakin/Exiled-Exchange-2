# Proposal

## Why

The overlay UI (`renderer/src/web/`) still reads as a flat 2020-era admin panel: opaque gray surfaces, icon-font glyphs posing as form controls, joined gray tab blocks, and no design tokens (colors are hardcoded as ~160 `bg-gray-*` class usages). A modern "game-native" skin — translucent surfaces, hairline borders, a gold accent from the PoE2 palette — improves readability over the game and the tool's perceived quality, and a token layer is the prerequisite for any future theming. The direction was chosen over a literal Material Design 3 skin during exploration: M3 mechanics (tokens, state layers, motion discipline) without its pastel product look.

## What Changes

- Add a design-token layer: new `renderer/src/assets/theme.css` (CSS variables — translucent surfaces, gold accent, text ramp, hairline borders, state layers, shared focus ring, motion durations/easing) and a remap of the `gray` ramp in `renderer/tailwind.config.js` (visual shift with a minimal diff; rarity/element colors untouched).
- Re-skin shared primitives in `renderer/src/web/ui/` as CSS-drawn controls: `UiCheckbox` / `UiToggle` / `UiRadio` (replacing FontAwesome glyphs), `UiTabs` (text tabs with accent indicator), `Popover` (elevation + motion), `AppTitlebar` (ghost icon buttons); restyle `.btn` variants and scrollbars in `renderer/src/web/App.vue`.
- Re-skin widget chrome in `renderer/src/web/overlay/Widget.vue`: floating icon-pill action panel (hold-to-delete progress kept), dashed-outline edit mode with corner handles instead of 1rem square movers.
- Price check: render stat filters as a checkbox list — an enabled row shows its threshold input and tier badge, a disabled row stays visible with its natural roll range; bulk exchange keeps chips.
- Hard constraints carried through implementation: no `backdrop-filter` (an Electron transparent window cannot blur the game behind it), animations limited to transform/opacity, `pointer-events` model and `data-gp-*` gamepad attributes untouched, Cyrillic fallback font (FrizQuadrataC) preserved.

## Capabilities

### New Capabilities

- `overlay-theme`: The visual design system of the overlay UI — design tokens (surfaces, accent, text, borders, state layers, focus, motion), themed shared controls, translucency rules for the transparent Electron overlay, unified keyboard/gamepad focus visibility, and the protected game-canon colors (item rarities, elements).

### Modified Capabilities

- `price-check`: The "Filter editing" requirement is re-specified — stat filters render as a checkbox list (enable per affix, threshold input, tier badge, natural roll range visible while disabled) instead of toggle chips. The filters logic modules (`create-*-filters.ts`) do not change.

## Impact

- **Code**: `renderer/src/assets/theme.css` (new), `renderer/tailwind.config.js`, `renderer/src/web/App.vue`, `renderer/src/web/ui/*`, `renderer/src/web/overlay/Widget.vue`, and render-level edits in `renderer/src/web/price-check/filters/` (notably `FilterBtn*.vue` / `FiltersBlock.vue`). No main-process or dataParser changes.
- **Upstream mergeability**: touches files shared with upstream. The strategy deliberately minimizes conflict surface: the look changes through the tailwind `gray` remap, the new `theme.css`, and re-skins confined to `web/ui/*` + `Widget.vue` + `App.vue` globals. No mass class renames in feature components, no upstream reformatting. Expected merge conflicts are limited to `tailwind.config.js` and the listed primitives; a dry-run merge against `upstream` master is part of verification.
- **Gamepad feature**: unaffected functionally — `data-gp-row` / `data-gp-section` attributes and navigation logic stay; the gamepad focus highlight is moved onto the shared focus token so mouse and gamepad focus look identical. Must be verified by a gamepad navigation pass.
- **Linux (X11/Wayland)**: no platform-specific code; translucency is plain `rgba` compositing and behaves identically on both platforms.
- **Out of scope**: theme switcher / light theme, feature layout restructuring, any blur/acrylic effect, changes to filter generation logic (`create-*-filters.ts`), removing the `animate.css` dependency, icon-library migration beyond what primitives need.
