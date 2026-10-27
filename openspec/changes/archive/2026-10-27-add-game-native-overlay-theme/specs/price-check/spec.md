# Spec Delta

## MODIFIED Requirements

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
