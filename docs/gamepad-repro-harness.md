# Gamepad navigation repro harness

Headless way to verify the renderer's gamepad navigation (the
`renderer/src/web/overlay/gamepad/` engine and the window scopes) in a plain
browser, without the game or the Electron main process. Real
`MAIN->CLIENT::gamepad-input` events are injected over the same WebSocket
transport the app uses.

## Fake backend

`node docs/gamepad-repro-backend.cjs` — listens on `127.0.0.1:8584`:

- `GET /config` — serves the config stored via `/config-set` (or `contents: null` → renderer defaults);
- `POST /config-set` (body: JSON config) — stores the config;
- `POST /inject` (body: JSON `{ name, payload }`) — broadcasts the IPC event to all connected clients.

The Vite dev server proxies `/config` and `/events` to this port
(`renderer/vite.config.mts`), so no renderer changes are needed.

## Steps

1. Start the renderer only: `cd renderer && npm run make-index-files && npm run dev` (port 5173). The main process is NOT started.
2. `node docs/gamepad-repro-backend.cjs`.
3. Open `http://localhost:5173/` in a browser. If `#app` stays empty, the page hung on `Host.init()` — the backend is not reachable.
4. The widget menu is missing from the renderer defaults; build a config with it and persist it (once, in the browser console):

   ```js
   const dynImport = new Function("u", "return import(u)");
   const { AppConfig } = await dynImport("/src/web/Config.ts");
   const cfg = JSON.parse(JSON.stringify(AppConfig()));
   if (!cfg.widgets.some((w) => w.wmType === "menu")) {
     cfg.widgets.push({
       wmId: Math.max(0, ...cfg.widgets.map((w) => w.wmId)) + 1,
       wmType: "menu",
       wmTitle: "",
       wmWants: "show",
       wmZorder: 1,
       wmFlags: ["invisible-on-blur", "menu::skip"],
       anchor: { pos: "tl", x: 5, y: 5 },
       alwaysShow: false,
     });
   }
   await fetch("/config-set", { method: "POST", body: JSON.stringify(cfg) });
   location.reload();
   ```

5. Activate the overlay (the browser UA contains "Electron", so the renderer
   believes Electron is present and starts passive):

   ```sh
   curl -s -X POST http://127.0.0.1:8584/inject \
     -d '{"name":"MAIN->OVERLAY::focus-change","payload":{"overlay":true,"game":false}}'
   ```

6. Drive the pad (one press = down + up):

   ```sh
   press() { curl -s -X POST http://127.0.0.1:8584/inject \
     -d "{\"name\":\"MAIN->CLIENT::gamepad-input\",\"payload\":{\"button\":\"$1\",\"phase\":\"down\"}}"; sleep 0.2; \
     curl -s -X POST http://127.0.0.1:8584/inject \
     -d "{\"name\":\"MAIN->CLIENT::gamepad-input\",\"payload\":{\"button\":\"$1\",\"phase\":\"up\"}}"; }
   press DPAD_DOWN   # engage focus in the topmost shown window
   press A           # activate the focused control
   ```

7. Assertions: `.focused-gamepad` (control ring) and `.gp-focused-row` (row
   highlight) appear inside the target `#widget-<id>`; after an activation
   that re-renders the control (a map stat color cycle), the ring must stay.

## Map check

Inject a waystone as the item-check target (item text from
`renderer/specs/Parser/items.ts`):

```sh
curl -s -X POST http://127.0.0.1:8584/inject -d '{
  "name": "MAIN->CLIENT::item-text",
  "payload": {
    "target": "item-check",
    "clipboard": "Item Class: Waystones\nRarity: Rare\nDesolate Route\nWaystone (Tier 14)\n--------\nRevives Available: 2 (augmented)\n--------\nItem Level: 80\n--------\nCan be used in a Map Device, allowing you to enter a Map. Waystones can only be used once.",
    "position": { "x": 700, "y": 450 },
    "focusOverlay": false
  }
}'
```

The map check widget replaces the settings/price-check window (exclusive
z-order); `press DPAD_DOWN` then walks the profile row and the stat rows.
