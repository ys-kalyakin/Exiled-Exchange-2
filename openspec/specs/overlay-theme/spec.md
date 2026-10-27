# overlay-theme Specification

## Purpose

The visual design system of the overlay UI (`renderer/src/web/`): design tokens (translucent surfaces, gold accent, text ramp, borders, state layers, focus ring, motion), themed shared controls in `renderer/src/web/ui/`, translucency rules for the transparent Electron overlay window, unified keyboard/gamepad focus visibility, and the protected game-canon colors. Consumed by every widget capability; feature behavior lives in the respective specs.

## Requirements

### Requirement: Design tokens are the theme source of truth
The overlay UI SHALL consume its theme from a single token file (`renderer/src/assets/theme.css`) that defines translucent surface levels (widget body, raised chrome, exclusive windows, sunk fields), a gold accent, text opacity levels, hairline borders, hover/active state layers, a shared focus color, and motion durations with easing; the neutral `gray` ramp in `renderer/tailwind.config.js` SHALL be remapped to match the token surfaces.

#### Scenario: Themed component resolves colors from tokens
- **WHEN** a themed surface, text, border, or state color is rendered by a shared primitive or widget chrome
- **THEN** it resolves from the theme tokens rather than a newly hardcoded palette value

#### Scenario: Translucency without backdrop effects
- **WHEN** any themed surface is rendered in the transparent overlay window
- **THEN** it uses plain rgba compositing with no `backdrop-filter`, so the look is identical on Windows and Linux (X11/Wayland) and adds no per-frame blur cost while gaming

### Requirement: Game-canon colors are preserved
The item rarity and element colors in `renderer/tailwind.config.js` (`normal`, `magic`, `rare`, `unique`, `fire`, `cold`, `lightning`) SHALL keep their existing values; only the neutral `gray` ramp is remapped by this theme.

#### Scenario: Rare item name stays canonical
- **WHEN** a rare item name is rendered anywhere in the overlay
- **THEN** it uses the same yellow as before the theme change

### Requirement: Shared controls are CSS-drawn and themed
The shared form controls in `renderer/src/web/ui/` (checkbox, toggle, radio, tabs, buttons) SHALL render as themed CSS controls with accent checked/active states and motion on state change, replacing icon-font glyph placeholders; their props and events SHALL remain compatible with existing call sites.

#### Scenario: Toggle switch animates on
- **WHEN** the user switches a boolean setting on
- **THEN** the switch shows an accent-filled track with the thumb moved to the end via a transform transition

#### Scenario: Tabs indicate the active tab
- **WHEN** the user selects a tab
- **THEN** the active tab is marked by an accent indicator and remains keyboard operable as before

### Requirement: Unified focus visibility
Keyboard focus (`:focus-visible`) and gamepad navigation SHALL highlight the focused control with the same accent focus indicator, and every interactive themed control SHALL show a visible focus state; gamepad navigation attributes (`data-gp-*`) and behavior SHALL be unchanged.

#### Scenario: Gamepad focus matches keyboard focus
- **WHEN** the user navigates the price check or settings UI with a gamepad
- **THEN** the focused element shows the same accent focus indicator used for keyboard focus

### Requirement: Motion budget and reduced motion
Theme motion SHALL animate only `transform` and `opacity` (plus the existing `background-position` hold-to-delete fill), and SHALL disable themed transitions when the OS reports `prefers-reduced-motion: reduce`.

#### Scenario: Reduced motion honored
- **WHEN** the system requests reduced motion
- **THEN** themed transitions apply their end state without animation

### Requirement: Widget action chrome
A movable widget's hover action panel SHALL render as a floating pill of icon actions (hide, edit, move, delete) with tooltips, deletion SHALL still require a held press of about one second with a visible progress fill and cancel on early release, and edit/move mode SHALL show a dashed accent outline with corner handles.

#### Scenario: Hold to delete is preserved
- **WHEN** the user holds the delete action for about one second
- **THEN** the widget is removed, and releasing earlier cancels the removal

#### Scenario: Edit mode affordance
- **WHEN** the user enters move mode on a widget
- **THEN** the widget shows a dashed accent outline with corner handles while the anchor positioning behavior stays as specified in `overlay-widgets`

### Requirement: Localized typography preserved
The theme SHALL keep the Fontin SmallCaps/Fontin faces for chrome text with FrizQuadrataC as the Cyrillic-capable fallback, and numeric readouts (prices, counts) SHALL use tabular numerals so aligned columns do not shift.

#### Scenario: Russian UI renders
- **WHEN** the overlay language is set to Russian
- **THEN** labels render through the Cyrillic-capable fallback without missing glyphs
