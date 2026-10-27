# Spec Delta

## ADDED Requirements

### Requirement: Gamepad configuration section
The config SHALL hold a `gamepad` section holding: per-button intent assignments (gamepad button name to a navigation intent, a shortcut action, or none), navigation auto-repeat delay and interval, a navigation enabled toggle, and a stick dead-zone. Buttons without an explicit assignment SHALL keep their default intent. Defaults SHALL preserve the shipped behavior. Loading a config saved by an older version SHALL fill the missing gamepad section with these defaults.

#### Scenario: Fresh config
- **WHEN** the app starts without a saved config
- **THEN** the gamepad section carries the default behavior: d-pad movement, A activation, B back, X Search, Y trade browser, LB next preset, RB next filter section, 400 ms repeat delay, 80 ms repeat interval, navigation enabled and the default dead-zone

#### Scenario: Config from an older version
- **WHEN** a saved config predates the gamepad section
- **THEN** the section is filled with the defaults while the rest of the config is kept

## MODIFIED Requirements

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
