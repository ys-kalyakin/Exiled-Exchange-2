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
The renderer SHALL push a typed `HostConfig` (game log path, game config keys, initial delay, hide-on-blur, restore clipboard, and `ShortcutAction[]` including `shortcut` and the fork's `gamepadCombo`) via `CLIENT->MAIN::update-host-config`; the host SHALL apply it and reply with the updated state.

#### Scenario: User changes the price-check hotkey
- **WHEN** the hotkey setting is saved
- **THEN** the resulting `ShortcutAction` (with its `gamepadCombo`) reaches the main process and is used by `Shortcuts.updateActions`
