# Spec Delta

## ADDED Requirements

### Requirement: Settings hotkey row layout
In the settings hotkeys tab (`renderer/src/web/settings/SettingsHotkey.vue`), each hotkey row SHALL render the keyboard binding control and the gamepad combo control as separate non-overlapping columns, with the gamepad column starting at the same position on every row. The keyboard column SHALL contain the full split modifier control without overflowing into the gamepad column.

#### Scenario: Price check hotkey row with split modifier control
- **WHEN** the price check hotkey row shows the Ctrl/Alt + key split control together with its gamepad combo input
- **THEN** the split control stays inside the keyboard column and does not cover any part of the gamepad combo input

#### Scenario: Columns aligned across rows
- **WHEN** the hotkeys tab lists several rows that mix plain key inputs and split modifier controls
- **THEN** the gamepad combo controls of all rows start at the same horizontal position

#### Scenario: Long localized labels
- **WHEN** the UI language renders row labels longer than the English ones
- **THEN** the labels wrap or shrink within their flexible space and the binding columns still do not overlap
