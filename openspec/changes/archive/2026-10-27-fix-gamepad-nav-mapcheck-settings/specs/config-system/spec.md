# config-system Delta

## ADDED Requirements

### Requirement: Item-check gamepad combo default
The item-check widget config SHALL carry a `gamepadHotkey` field defaulting to `L3 + LT`, used by the shortcut registry as the gamepad combination of the item-check `copy-item` action. A config migration SHALL fill this default into configs saved before the map check became pad-openable, keeping any user-set binding. The price-check combos (`R3 + RT`, `L3 + RT`) SHALL remain unchanged.

#### Scenario: Fresh config
- **WHEN** a fresh default config is created
- **THEN** the item-check widget has `gamepadHotkey: "L3 + LT"` and the shortcut registry registers that combination for the item-check copy action

#### Scenario: Migration of an older config
- **WHEN** a config saved before this change is loaded (its item-check `gamepadHotkey` is missing or the migration-added `null`, which is the old default rather than a deliberate clearing)
- **THEN** the migration fills the item-check `gamepadHotkey` with `L3 + LT` and keeps every other setting, including the existing price-check combos and any user-set combo, unchanged

#### Scenario: Clearing the combo after the migration
- **WHEN** the user clears the item-check gamepad binding in the settings and saves
- **THEN** the empty binding persists (the migration rung does not run again for the saved config)
