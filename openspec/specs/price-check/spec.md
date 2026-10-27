# price-check Specification

## Purpose
The flagship widget (`renderer/src/web/price-check/`): receives a copied item and shows trade listings — filter selection, query against the trade website, result list with prices, and auxiliary panels (item editor, related items, price prediction, trends, background info).

## Requirements

### Requirement: Open at the cursor
On `MAIN->CLIENT::item-text` targeted at `price-check`, the widget SHALL open near the cursor position (with a position indicator circle) and parse the item text.

#### Scenario: User presses the price-check hotkey over an item
- **WHEN** the item-text event arrives with the cursor position
- **THEN** the price check window opens at that position and shows the parsed item

### Requirement: Trade query from generated filters
The widget SHALL generate trade query filters from the parsed item (exact match by default), query the trade website through the app proxy, and render found listings with prices converted via the exchange rates view.

#### Scenario: Rare item check
- **WHEN** a parsed rare item is checked
- **THEN** a trade query is sent and listings are displayed with their asking prices

### Requirement: Filter editing and item editor
The user SHALL be able to adjust search filters and re-run the query, and to edit the parsed item text (item editor) to fix or refine what is being searched. Stat filters SHALL render as a checkbox list (`renderer/src/web/price-check/filters/`): each row pairs a checkbox with the affix name; enabling a row reveals its threshold editor (and tier badge where applicable), while a disabled row remains visible, dimmed, with its natural roll range instead of a threshold input. Bulk exchange currency selection keeps chip-style toggles. In trade listings, each price row SHALL show the listing's currency icon in a fixed left slot of the price cell so that all icons form one vertical line; currencies without reserved art keep an empty slot of the same width.

#### Scenario: Narrow results via filters
- **WHEN** the user disables a filter group or changes a filter value
- **THEN** the query is re-sent and the result list updates

#### Scenario: Enable a stat filter via checkbox
- **WHEN** the user ticks an affix row in the filter list
- **THEN** the row reveals its threshold input and the subsequent search uses the enabled filter

#### Scenario: Disabled filter shows natural range
- **WHEN** a stat filter row is not enabled
- **THEN** the row stays visible and dimmed, showing the affix's natural roll range rather than a threshold input

### Requirement: Auxiliary result panels
The widget SHALL provide auxiliary panels where enabled: related items, price prediction (poeprices.info), market trends, stack value and background item info.

#### Scenario: Prediction enabled
- **WHEN** price prediction is enabled and the item is recognized by the service
- **THEN** a predicted price range is shown alongside trade listings

### Requirement: Failure fallback
When results cannot be loaded (network failure, unsupported item, empty data set), the widget SHALL show its fallback view instead of an unhandled error.

#### Scenario: Trade site unreachable
- **WHEN** the query fails due to network problems
- **THEN** the fallback panel is displayed and the overlay stays usable

### Requirement: Hold and locked hotkey modes
Price check SHALL support the hold variant (opens while the key is held, `focusOverlay: false`) and the locked variant (`hotkeyLocked`, `focusOverlay: true` keeps the window active after release).

#### Scenario: Locked check on gamepad
- **WHEN** the locked price check combo is used
- **THEN** results remain visible after the keys are released
