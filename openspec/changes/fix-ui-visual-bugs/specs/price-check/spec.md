# Spec Delta

## MODIFIED Requirements

### Requirement: Filter editing and item editor
The user SHALL be able to adjust search filters and re-run the query, and to edit the parsed item text (item editor) to fix or refine what is being searched. Stat filters SHALL render as a checkbox list (`renderer/src/web/price-check/filters/`): each row pairs a checkbox with the affix name; enabling a row reveals its threshold editor (and tier badge where applicable), while a disabled row remains visible, dimmed, with its natural roll range instead of a threshold input. Bulk exchange currency selection keeps chip-style toggles. In trade listings, each price row SHALL show the listing's currency icon in a fixed left slot of the price cell so that all icons form one vertical line; currencies with committed art — including the core currencies, Orb of Alchemy and Mirror of Kalandra — SHALL render that art in the slot, and only currencies without committed art keep an empty slot of the same width.

#### Scenario: Narrow results via filters
- **WHEN** the user disables a filter group or changes a filter value
- **THEN** the query is re-sent and the result list updates

#### Scenario: Enable a stat filter via checkbox
- **WHEN** the user ticks an affix row in the filter list
- **THEN** the row reveals its threshold input and the subsequent search uses the enabled filter

#### Scenario: Disabled filter shows natural range
- **WHEN** a stat filter row is not enabled
- **THEN** the row stays visible and dimmed, showing the affix's natural roll range rather than a threshold input

#### Scenario: Listing priced in Orb of Alchemy
- **WHEN** a trade result is listed for Orb of Alchemy
- **THEN** the price row's icon slot shows the Orb of Alchemy art on the same vertical line as the other rows' icons

#### Scenario: Listing priced in Mirror of Kalandra
- **WHEN** a trade result is listed for Mirror of Kalandra
- **THEN** the price row's icon slot shows the Mirror of Kalandra art on the same vertical line as the other rows' icons

## ADDED Requirements

### Requirement: Numeric filter chip layout
Numeric filter chips in the price check filter panel (`renderer/src/web/price-check/filters/FilterBtnNumeric.vue` — Item Level, Requires Level, Stock, Gem Level, Quality, and their peers) SHALL keep visible separation between the chip's label and the part that follows it: the natural-value readout in the disabled state and the threshold editor in the enabled state. The label SHALL never touch or overlap the value or editor regardless of UI language or UI font size.

#### Scenario: Disabled Item Level chip
- **WHEN** the Item Level chip is disabled and shows the item's natural item level
- **THEN** a small gap separates the "Item Level" label from the value, with no glyph overlap

#### Scenario: Enabled Item Level chip with range editor
- **WHEN** the Item Level chip is enabled
- **THEN** the label, the min input, the range dash and the max input are individually legible and none of them overlaps a neighbor
