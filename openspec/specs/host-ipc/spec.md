# host-ipc Specification

## Purpose
The bridge between the Electron main process ("host") and the renderer clients: a local HTTP + WebSocket server (`main/src/server.ts`) carrying the typed event union from `ipc/types.ts`, plus static asset and file-upload routes.

## Requirements

### Requirement: Local server hosting the renderer
The main process SHALL serve the renderer over a local HTTP server (static assets in production, Vite dev server URL in development) and a WebSocket endpoint on the same port; file upload routes SHALL be mounted under `/uploads`.

#### Scenario: Renderer connects
- **WHEN** the overlay renderer window loads
- **THEN** it connects to the host over WebSocket and receives host state and config

### Requirement: Typed event union
All host↔client messages SHALL use the `IpcEvent` union (`ipc/types.ts`) — event `name` plus typed `payload` — so both sides are type-checked against the same contract.

#### Scenario: Unknown event name
- **WHEN** a side emits an event not present in the union
- **THEN** TypeScript compilation fails

### Requirement: Broadcast and last-active routing
The server SHALL support sending to all clients (`broadcast`) and to the most recently active client (`last-active`, e.g. for item-text results); client connection changes SHALL update the last-active target.

#### Scenario: Copy item with two overlay clients
- **WHEN** an `item-text` event is sent to `last-active`
- **THEN** only the most recently active renderer client receives it

### Requirement: User actions from the renderer
The host SHALL accept `CLIENT->MAIN::user-action` events (e.g. `stash-search`) from renderer widgets and execute the corresponding main-process flow.

#### Scenario: Stash search widget action
- **WHEN** the renderer sends `user-action` with `action: "stash-search"`
- **THEN** the main process performs the stash search with the given text
