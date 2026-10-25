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
