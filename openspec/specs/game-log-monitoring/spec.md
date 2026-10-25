# game-log-monitoring Specification

## Purpose
Tails the Path of Exile 2 client log (`main/src/host-files/GameLogWatcher.ts`) and streams new lines to the renderer, where the client-log widget parses them into user-facing events (AFK state changes, etc.).

## Requirements

### Requirement: Client log discovery and watching
The host SHALL locate the game client log (user-configured path, otherwise auto-detection among known install locations), SHALL report an error listing found candidates when detection is ambiguous, and SHALL tail the file for appended content.

#### Scenario: Two candidate log files
- **WHEN** auto-detection finds more than one client log
- **THEN** an error is logged asking the user to pick one in settings and watching does not start

### Requirement: Streaming new lines
New log lines SHALL be broadcast to the renderer as `MAIN->CLIENT::game-log` with the raw lines, polled shortly after each file change.

#### Scenario: New chat line appears in the log
- **WHEN** the game appends lines to Client.txt
- **THEN** the renderer receives them as a `game-log` event within the polling interval

### Requirement: Opt-in client-log widget
The client-log widget SHALL parse streamed lines into typed events (e.g. `AfkEvent`) and show notifications only when the user enabled client log tracking in settings.

#### Scenario: Tracking disabled
- **WHEN** the user disabled the client-log option
- **THEN** streamed lines are not turned into notifications

### Requirement: Parsing lives in the renderer
The main process SHALL only broadcast raw lines; interpretation of log lines into typed events SHALL live in the renderer's client-log module, so new event kinds do not require host changes.

#### Scenario: New log event kind
- **WHEN** a new log pattern needs to be recognized
- **THEN** only the renderer client-log parser and its event type in `ipc/types.ts` change
