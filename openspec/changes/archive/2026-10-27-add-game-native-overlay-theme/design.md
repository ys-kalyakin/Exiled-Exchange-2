# Design

## Context

The overlay renderer (`renderer/src/web/`, 96 Vue files) is styled with Tailwind-era hardcoded grays: ~160 `bg-gray-*` usages, no CSS variables, FontAwesome glyphs as checkbox/toggle controls, joined gray tab blocks, a red-gradient titlebar close. The repo is a fork that tracks upstream (`Kvan7/Exiled-Exchange-2`) and must stay mergeable; gamepad navigation (`data-gp-*` attributes) is a first-class fork feature. The overlay is an Electron transparent window composited over the game. Motivation and scope: see proposal.md; behavior contracts: see specs deltas.

## Goals / Non-Goals

**Goals:**
- A single token layer that shifts the whole look with a minimal diff, keeping future theming cheap.
- A restrained "game-native" skin: angular translucent surfaces, hairline borders, gold accent, Fontin identity — coherent with PoE2's UI an inch away from it.
- Primitive-level re-skins only; feature layouts and logic untouched.

**Non-Goals:**
- Theme switcher or light theme.
- Any blur/acrylic effect (see Decision 2).
- Restructuring feature component layouts, filter generation logic (`create-*-filters.ts`), or removing `animate.css`.
- Icon-library migration beyond what the re-skinned primitives need (FontAwesome stays a dependency).

## Decisions

### 1. Game-native skin, organized by Material-3-style token mechanics
Not a literal Material skin. M3's mechanics (tokens, state layers, elevation via surface levels, motion discipline) are adopted; its look (pastel tonal surfaces, 12–16px radii, pills) is not — it reads as a product app against PoE2's angular gothic UI. Alternatives: literal Material 3 (rejected: alien next to the game; a mockup comparison confirmed it), Fluent/acrylic (rejected: see Decision 2).

### 2. Plain rgba translucency, no `backdrop-filter`
An Electron transparent window cannot sample the game pixels behind it, so `backdrop-filter` blurs nothing (only in-page content) while still costing GPU during gameplay. All translucency is flat rgba. This also keeps Windows and Linux (X11/KWin) rendering identical.

### 3. Tokens = new `theme.css` + `gray` ramp remap (the mergeability lever)
Change the values under existing classes instead of renaming classes in 96 files. `renderer/src/assets/theme.css` (new, imported in `App.vue` before Tailwind directives) holds the semantic variables; `renderer/tailwind.config.js` remaps only the `gray` object (values below), so existing `bg-gray-*`/`text-gray-*` utilities across all features shift with the config. Rarity/element colors are untouched.

```css
:root {
  /* surfaces — plain rgba, no backdrop-filter */
  --ee-surface:         rgba(16, 18, 24, 0.92);  /* widget body */
  --ee-surface-raised:  rgba(24, 27, 34, 0.97);  /* titlebars, popovers, pills */
  --ee-surface-overlay: rgba(10, 12, 16, 0.98);  /* exclusive windows: settings, help, price-check */
  --ee-surface-sunk:    rgba(8, 10, 14, 0.85);   /* inputs, listings, <pre> */

  --ee-border:        rgba(255, 255, 255, 0.07);
  --ee-border-strong: rgba(255, 255, 255, 0.14);
  --ee-separator:     rgba(255, 255, 255, 0.05);

  --ee-accent:        #c9a761;   /* gold, tuned against in-game screenshots in the mockup */
  --ee-accent-strong: #dfc084;
  --ee-accent-dim:    rgba(201, 167, 97, 0.16);

  --ee-hover:  rgba(255, 255, 255, 0.06);
  --ee-active: rgba(255, 255, 255, 0.12);
  --ee-focus:  var(--ee-accent);

  --ee-shadow-1: 0 2px 6px rgba(0, 0, 0, 0.4);
  --ee-shadow-2: 0 8px 24px rgba(0, 0, 0, 0.55);

  --ee-dur-1: 80ms; --ee-dur-2: 140ms; --ee-dur-3: 220ms;
  --ee-ease: cubic-bezier(0.2, 0, 0, 1);

  --ee-text-1: #e4e8ee; --ee-text-2: #9aa3b2; --ee-text-3: #667082;
}
```

Tailwind `gray` remap (only this object): `100 #f5f7fa, 200 #e4e8ee, 300 #c3c9d4, 400 #9aa3b2, 500 #667082, 600 #3a4150, 700 #2a303c, 800 #1b1f27, 900 #14171d` — L-values close to the current ramp so existing class combinations keep their contrast relationships. `prefers-reduced-motion: reduce` sets all `--ee-dur-*: 0ms`.

### 4. Primitives re-skinned in place, APIs untouched
`UiCheckbox`, `UiToggle`, `UiRadio`: CSS-drawn box / track+thumb / ring with accent checked state (replacing `fa-square`/`fa-toggle-*` glyphs); same props/events. `UiTabs`: text tabs with a 2px accent underline indicator on a hairline baseline. `AppTitlebar`: 1.75rem, raised surface, ghost icon buttons, close hover = soft red tint (replaces the full red fill). `Popover`: raised surface, 1px hairline, shadow-2, 120ms fade + `scale(0.98→1)`. `App.vue`: `.btn` gains `primary` (gold fill, dark text — the Search CTA) and `danger` variants; scrollbar slimmed to 0.5rem thumb; `:focus-visible` ring = 2px `--ee-focus`, offset 1px. Feature components keep calling the same primitives — no call-site churn.

### 5. Widget chrome: icon pill + dashed edit outline
`Widget.vue` action panel becomes a floating pill (hide/edit/move/delete icon buttons, tooltips) shown on hover; hold-to-delete keeps the existing ~1s `background-position` fill mechanic, moved onto the trash icon. Move mode draws a dashed 1px accent outline with 0.375rem corner dots instead of 1rem square movers; anchor positioning math is untouched.

### 6. Stat filters render as a checkbox list (user decision)
`FiltersBlock`/`FilterBtn*` render each stat filter as a row: checkbox + affix name; enabled rows show the threshold editor and tier badge (where applicable); disabled rows stay visible and dimmed showing the natural roll range. The filter data model and `create-*-filters.ts` are unchanged — this is a render-layer change over the existing enable/disable toggle semantics. Bulk exchange (`trade-bulk`) keeps chips for currency selection.

### 7. Focus: one token for mouse and gamepad
The gamepad navigation highlight and `:focus-visible` both consume `--ee-focus`, so keyboard and gamepad focus are visually identical. `data-gp-*` attributes and navigation logic are not modified.

### 8. Typography
FontinSmallCaps/Fontin stay as the identity (chrome text, labels); FrizQuadrataC remains the Cyrillic fallback in every font stack. Prices/counts get a `.tnum` utility (`font-variant-numeric: tabular-nums` + system sans fallback) because Fontin lacks tabular figures and listing price columns shift without it.

## Risks / Trade-offs

- [Contrast on translucent surfaces over bright game areas] → surfaces stay ≥0.85 alpha on near-black bases; acceptance includes a contrast check (≥4.5:1 body text) on the lightest surface.
- [Upstream merge conflicts] → conflict surface is deliberately `tailwind.config.js`, `theme.css` (new), `App.vue` globals, `web/ui/*`, `Widget.vue`; a dry-run merge against `upstream` master is a verification task. No upstream reformatting.
- [Visual regressions across 96 components] → phase order (tokens → primitives → chrome → price-check → settings → QA) lets each commit be reviewed and reverted independently; screenshot checklist per phase.
- [GPU cost while gaming] → transform/opacity-only motion, fixed shadows, no per-frame blur; `prefers-reduced-motion` honored.
- [Cyrillic metrics differ from Fontin] → both locales verified visually; fallback stack unchanged.
- [Checkbox rows denser than chips in long affix lists] → rows reuse existing list scrolling; ellipsized names with roll range kept visible.

## Migration Plan

Phased, each phase one commit and independently verifiable (renderer `lint`/`check-types`/`test` + visual smoke via two-shell dev):

1. Tokens: `theme.css` + `gray` remap (global shift, smallest diff).
2. Primitives: `web/ui/*`, `.btn`/scrollbar/focus in `App.vue`.
3. Widget chrome: `Widget.vue` + `AppTitlebar`.
4. Price check: checkbox filter rows + listing polish (row hover replaces zebra, `.tnum` prices).
5. Settings pass: verify forms on new surfaces; localized class tweaks only.
6. QA: gamepad navigation pass, ru/en screenshots, contrast check, `pre-commit run --all-files`, dry-run merge against `upstream`.

Rollback: revert the phase commit; phase 1 alone is the "look switch" and phases 2–6 are additive refinements.

## Open Questions

- Exact gold hue may be fine-tuned during apply against in-game screenshots (mockup used `#c9a761`); this does not change the spec, which pins the token mechanism, not the hex.
- Per-type row variants for `FilterBtnDropdown` / `FilterBtnLogical` / `FilterBtnNumeric` (e.g., where the dropdown trigger sits in a row) are resolved during apply against the real components; the spec pins the checkbox-row interaction, not the sub-layout.
