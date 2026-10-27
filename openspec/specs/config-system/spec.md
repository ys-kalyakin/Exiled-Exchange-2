# config-system Specification

## Purpose
Configuration for the whole app (renderer `renderer/src/web/Config.ts`, host persistence `main/src/host-files/ConfigStore.ts`): per-widget settings, defaults and migration of old configs, saving to the host, and the host config (paths, game config, shortcut actions) pushed from the renderer to the main process.

## Requirements

### Requirement: Per-widget configuration
The config SHALL hold one settings object per widget keyed by `wmType`, initialized from `defaultConfig()`, and every widget SHALL read and update its own slice reactively.

#### Scenario: First launch
- **WHEN** the app starts without a saved config
- **THEN** all widgets receive their default configuration and the font size is applied to the document root

### Requirement: Config migration
On load the app SHALL run `upgradeConfig` to migrate configs saved by older app versions to the current shape instead of discarding them.

#### Scenario: Config from an older version
- **WHEN** a saved config lacks fields introduced by newer versions
- **THEN** missing fields are filled with defaults and legacy fields are remapped

### Requirement: Saving and persistence
The renderer SHALL save changes via `CLIENT->MAIN::save-config` only when the config actually differs from the last saved snapshot, supporting temporary saves; the host (`ConfigStore`) SHALL persist the contents to disk and broadcast `MAIN->CLIENT::config-changed` to all clients.

#### Scenario: Repeated identical saves
- **WHEN** the renderer attempts to save a config equal to the last saved one
- **THEN** no save event is sent to the host

### Requirement: Save guard for exclusive widgets
Saving SHALL be skipped while a widget with `wmZorder: "exclusive"` is shown, to avoid persisting a layout captured in a modal state.

#### Scenario: Settings widget open during autosave
- **WHEN** the settings (exclusive) widget is shown and a save is attempted
- **THEN** the save is ignored

### Requirement: Host config and shortcut actions
The renderer SHALL push a typed `HostConfig` (game log path, game config keys, initial delay, hide-on-blur, restore clipboard, and `ShortcutAction[]` including `shortcut` and the fork's `gamepadCombo`) via `CLIENT->MAIN::update-host-config`; the host SHALL apply it and reply with the updated state. The `gamepadCombo` of a shortcut action SHALL be sourced from the widget configuration owning the action: the price check widget's `gamepadHotkey` and `gamepadHotkeyLocked` fields (defaulting to `R3 + RT` and `L3 + RT`) replace the hardcoded values; a cleared field SHALL omit the gamepad combo from the pushed action.

#### Scenario: User changes the price-check hotkey
- **WHEN** the hotkey setting is saved
- **THEN** the resulting `ShortcutAction` (with its `gamepadCombo`) reaches the main process and is used by `Shortcuts.updateActions`

#### Scenario: User rebinds the price-check gamepad combo
- **WHEN** the user sets the price-check gamepad combo to `R3 + LT` in the settings
- **THEN** the pushed `ShortcutAction` carries `R3 + LT` and main registers that combination

#### Scenario: User clears the gamepad combo
- **WHEN** the user clears the price-check gamepad combo field
- **THEN** the pushed `ShortcutAction` carries no gamepad combo and no combination is registered for the entry


### Requirement: Gamepad configuration section
The config SHALL hold a `gamepad` section holding: per-button intent assignments (gamepad button name to a navigation intent, a shortcut action, or none), navigation auto-repeat delay and interval, a navigation enabled toggle, and a stick dead-zone. Buttons without an explicit assignment SHALL keep their default intent. Defaults SHALL preserve the shipped behavior. Loading a config saved by an older version SHALL fill the missing gamepad section with these defaults.

#### Scenario: Fresh config
- **WHEN** the app starts without a saved config
- **THEN** the gamepad section carries the default behavior: d-pad movement, A activation, B back, X Search, Y trade browser, LB next preset, RB next filter section, 400 ms repeat delay, 80 ms repeat interval, navigation enabled and the default dead-zone

#### Scenario: Config from an older version
- **WHEN** a saved config predates the gamepad section
- **THEN** the section is filled with the defaults while the rest of the config is kept

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
