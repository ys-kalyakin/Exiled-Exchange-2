# overlay-widgets Specification

## Purpose
The widget system of the overlay UI (renderer, `renderer/src/web/`): each feature renders as a movable widget — price-check, map-check, stopwatch, leveling, notepad, item-search, stash-search, client-log, item-check, library, background, help, settings. This spec covers window-manager behavior common to all widgets; feature behavior lives in the respective capability specs.

## Requirements

### Requirement: Widget identity and window-manager state
Every widget SHALL have a stable `wmType` identifier and window-manager state fields (`wmWants`: show/hide, `wmZorder`: normal/exclusive) persisted in the config, and the app SHALL restore the last shown/hidden state on startup.

#### Scenario: Widget restored on start
- **WHEN** the app starts with a saved config where a widget has `wmWants: "show"`
- **THEN** that widget is rendered visible with its saved position and size

### Requirement: Dragging and resizing
Movable widgets SHALL be draggable and resizable by the user within overlay bounds, and their geometry SHALL be saved to the config.

#### Scenario: User moves a widget
- **WHEN** the user drags a widget header
- **THEN** the widget position updates and is persisted to the widget config

### Requirement: Exclusive widgets
Widgets marked `wmZorder: "exclusive"` (e.g., settings, help) SHALL render above normal widgets and SHALL prevent config saving while shown.

#### Scenario: Settings is open
- **WHEN** an exclusive widget is currently shown
- **THEN** `saveConfig` performs no save until it is hidden
