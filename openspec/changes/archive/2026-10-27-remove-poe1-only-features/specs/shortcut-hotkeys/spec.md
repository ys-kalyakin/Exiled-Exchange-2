# Spec Delta: shortcut-hotkeys

## MODIFIED Requirements

### Requirement: Action dispatch by type
The handler SHALL dispatch by `action.type`: `toggle-overlay`, `paste-in-chat`, `trigger-event` (widget-action broadcast), `stash-search`, `copy-item`, and `test-only` (registered, then immediately unregistered). The `ocr-text` action type (heist gems recognition) is removed and SHALL NOT be dispatched. Injection actions (`copy-item`, `paste-in-chat`, `stash-search`) SHALL dispatch only when input injection is available on the platform; without a helper on Wayland they SHALL be disabled with a user-visible notice.

#### Scenario: stash-search action
- **WHEN** a `stash-search` shortcut fires
- **THEN** the stash search flow runs with the configured text

#### Scenario: copy-item without injection helper on Wayland
- **WHEN** a `copy-item` shortcut fires on the Wayland backend while no injection helper is available
- **THEN** the action is not dispatched and the user sees a notice naming the missing injection helper

#### Scenario: ocr-text action no longer exists
- **WHEN** a saved config still contains a shortcut action of type `ocr-text`
- **THEN** no screenshot is taken, no event is sent, and the shortcut list simply ignores the entry
