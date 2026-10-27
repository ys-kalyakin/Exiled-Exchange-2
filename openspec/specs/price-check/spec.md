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
The widget SHALL generate trade query filters from the parsed item (exact match by default), query the trade website through the app proxy, and render found listings with prices converted via the exchange rates view. The generated query SHALL account for the parsed item's rarity: when the rarity filter is enabled, the query SHALL restrict results to the configured rarity option, and when the rarity filter is disabled, no rarity option SHALL be sent to the trade API.

#### Scenario: Rare item check
- **WHEN** a parsed rare item is checked
- **THEN** a trade query is sent and listings are displayed with their asking prices

#### Scenario: Magic item checked with the rarity filter enabled
- **WHEN** a parsed magic item is checked and the rarity filter is enabled
- **THEN** the trade query is restricted to magic listings of that base type, and the results reflect magic crafting-base prices

#### Scenario: Rarity filter disabled for a search
- **WHEN** the user disables the rarity filter chip for a search
- **THEN** the re-sent trade query contains no rarity option and results of any rarity are shown

### Requirement: Rarity filter setting and per-search control
The price-check widget SHALL provide a rarity filter setting with three modes: match the item's own rarity (default), legacy `nonunique`, and off. The rarity chip in the filter panel SHALL be interactive: clicking it SHALL toggle the rarity constraint off and on for the current search. Foil items SHALL keep querying `uniquefoil` and adorned jewels SHALL keep querying `magic` regardless of the setting or chip state.

#### Scenario: Magic item under the default setting
- **WHEN** the rarity filter setting is at its default and a magic item is checked
- **THEN** the query's rarity option is `magic`

#### Scenario: Rare item under the default setting
- **WHEN** the rarity filter setting is at its default and a rare item is checked
- **THEN** the query's rarity option is `rare`

#### Scenario: Legacy mode selected
- **WHEN** the rarity filter setting is set to the legacy `nonunique` mode and a magic or rare item is checked
- **THEN** the query's rarity option is `nonunique` (exact-search presets keep the item's exact rarity as they do today)

#### Scenario: Setting turned off
- **WHEN** the rarity filter setting is set to off and any normal, magic or rare item is checked
- **THEN** the trade query carries no rarity option

#### Scenario: Toggle the rarity chip during a search
- **WHEN** the user clicks the rarity chip in the filter panel and re-runs the search
- **THEN** the rarity constraint is dropped while the chip is toggled off and restored when toggled back on

#### Scenario: Foil or adorned jewel checked
- **WHEN** a foil item or an adorned jewel is checked
- **THEN** the query keeps the `uniquefoil` / `magic` rarity constraint respectively, independent of the setting or chip state

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

### Requirement: No PoE1-only filter mechanics
Price check and the map/item check SHALL NOT expose filters, tags, or trade query options for Path of Exile 1-only mechanics: the heist blueprint wings-revealed filter, heist job/wings static query options and heist item category mappings in the trade query, delve and incursion filter tags, and the heist-exclusive tag on area-mod stats in the map check settings. Unrecognized PoE1-only items fall back to the widget's unsupported-item view.

#### Scenario: Filters generated for an ordinary item
- **WHEN** stat and item filters are generated for a parsed item
- **THEN** no delve or incursion tag badges are offered, and no heist wings filter or heist-specific preset exists

#### Scenario: Trade query generation
- **WHEN** a trade query is built from a parsed item
- **THEN** the query contains no heist item categories and no heist job/wings static options

#### Scenario: Map check matcher settings
- **WHEN** the user edits the map check matcher settings
- **THEN** no heist-exclusive tag exists on any stat entry
