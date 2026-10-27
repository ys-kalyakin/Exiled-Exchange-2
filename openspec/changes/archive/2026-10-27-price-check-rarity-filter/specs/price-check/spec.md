# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
