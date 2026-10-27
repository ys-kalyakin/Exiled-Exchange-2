# Spec Delta: item-parsing

## ADDED Requirements

### Requirement: PoE1-only item content is not parsed
The parser SHALL NOT produce Path of Exile 1-specific structured data: Heist blueprint/contract details (target, wings, jobs), Blighted/Blight-ravaged map variants, Incursion room lists, and area levels of PoE1-only items (Chronicle of Atzoatl, Expedition Logbook, Mirrored Tablet, Forbidden Tome). Such items either parse into their generic item model or are not recognized as price-checkable items. Area-level parsing SHALL remain available for PoE2 trial items (Djinn Barya, Inscribed Ultimatum).

#### Scenario: Heist blueprint copied
- **WHEN** the clipboard contains a Heist blueprint or contract
- **THEN** no heist-specific structured data is produced and the item is not presented as a price-checkable heist item

#### Scenario: Map with blight base name copied
- **WHEN** the clipboard contains a map whose base type carries a Blighted/Blight-ravaged variant name
- **THEN** the map parses into the plain map model without a blight variant flag

#### Scenario: PoE2 trial item copied
- **WHEN** the clipboard contains a Djinn Barya or Inscribed Ultimatum
- **THEN** the item's area level (and trial count hints) still parse as before

#### Scenario: PoE1 incursion or logbook item copied
- **WHEN** the clipboard contains a Chronicle of Atzoatl or Expedition Logbook
- **THEN** no room list or area-level data is produced from the PoE1-only parsing branches
