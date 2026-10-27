# item-parsing Specification

## Purpose
Converts raw clipboard item text into a structured, language-aware item model (`renderer/src/parser/`, entry point `Parser.ts`) used by price check, item editors, and other widgets.

## Requirements

### Requirement: Clipboard text to structured item
The parser SHALL parse PoE2 item text into an `Item` model: item class, rarity, name and base type, item level, requirements, sockets/runes, quality, and flags such as corrupted and mirrored.

#### Scenario: Rare item copied
- **WHEN** clipboard text of a rare weapon is parsed
- **THEN** the resulting item exposes class, base, ilvl, and all explicit modifiers as structured data

### Requirement: Localized stat mapping
The parser SHALL map translated stat lines to internal modifier identifiers using the generated stats data (`dataParser` output), so behavior is independent of the game language.

#### Scenario: Russian game language
- **WHEN** an item with Russian affix lines is parsed while the Russian data set is loaded
- **THEN** affix lines resolve to the same modifier ids as their English equivalents

### Requirement: Unknown lines survive parsing
The parser SHALL retain lines it cannot map (unknown or new modifiers) as raw text entries instead of dropping them or failing.

#### Scenario: New league modifier
- **WHEN** the item text contains a modifier missing from the current data set
- **THEN** parsing succeeds and the modifier is shown as raw text

### Requirement: Parser regression tests
The parser SHALL stay covered by the Vitest suite (`renderer/specs/Parser/`) that parses example items and asserts the resulting structures; new data updates SHALL not silently change parsing results.

#### Scenario: Data update CI
- **WHEN** the test suite runs after a data update
- **THEN** all parser tests pass or the change is rejected

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
