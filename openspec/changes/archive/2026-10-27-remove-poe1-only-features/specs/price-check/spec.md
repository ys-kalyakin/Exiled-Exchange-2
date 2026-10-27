# Spec Delta: price-check

## ADDED Requirements

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
