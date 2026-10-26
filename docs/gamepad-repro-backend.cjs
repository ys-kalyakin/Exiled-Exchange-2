// Fake EE2 main-process backend: serves /config and relays WS events so the
// renderer can run in a plain browser (vite dev proxies /config,/events -> 8584).
// POST /inject {name, payload} broadcasts an IPC event to all connected clients.
const http = require("http");
const { WebSocketServer } = require("/home/helloween/projects/Exiled-Exchange-2/main/node_modules/ws");

const clients = new Set();

let configContents = null;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/config-set") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      configContents = body;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  if (req.method === "GET" && req.url === "/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        version: "0.16.3-test",
        updater: { state: "initial" },
        contents: configContents,
      }),
    );
    return;
  }
  if (req.method === "POST" && req.url === "/inject") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const event = JSON.parse(body);
      const msg = JSON.stringify(event);
      for (const ws of clients) {
        if (ws.readyState === 1) ws.send(msg);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, sent: clients.size }));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("client connected, total:", clients.size);
  ws.on("message", (data) => {
    // client -> main events are accepted and ignored (logged)
    console.log("client event:", data.toString().slice(0, 120));
  });
  ws.on("close", () => clients.delete(ws));
});

server.listen(8584, "127.0.0.1", () => console.log("fake backend on 8584"));
