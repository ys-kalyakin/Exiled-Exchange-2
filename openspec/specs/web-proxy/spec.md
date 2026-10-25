# web-proxy Specification

## Purpose
Network interception (`main/src/proxy.ts`): routes renderer requests to the supported trade and price hosts through the app's Electron session so auth cookies and headers apply consistently, and serves proxied requests from the local server.

## Requirements

### Requirement: Host routing
Requests to supported hosts SHALL be routed through the app: official trade domains (regional pathofexile.com mirrors, pathofexile.tw, poe.kakaogames.com) and unofficial services (poe.ninja, poeprices.info, api.exiledexchange2.dev).

#### Scenario: Trade query from price check
- **WHEN** the renderer requests a trade search on a regional trade domain
- **THEN** the request is served through the app's session with the user's cookies

### Requirement: Official/unofficial distinction
The proxy SHALL keep the `official` flag for each host so features can distinguish first-party trade endpoints from third-party services.

#### Scenario: Price prediction request
- **WHEN** a request goes to poeprices.info
- **THEN** it is recognized as an unofficial host and treated accordingly
