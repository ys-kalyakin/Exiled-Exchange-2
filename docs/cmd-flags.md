---
title: Command-line options
---

# Command-line options


- `--no-overlay`
Disables the creation of the Overlay Window completely.
Can be useful for Linux users using APT in the browser.

- `--listen=[host][:port]`
Changes the listening address for the built-in server.
Can be useful for people with buggy VPN clients that won't let connect to a local address.
Use `--listen=0.0.0.0` in that case.
By default, the server gets a random port, so bookmarking the page in the browser is useless.
You can change that as well.

- `--no-updates` Disables automatic downloading of updates and, consequently,
their installation.

- `--overlay-backend=x11|wayland`
Overrides the windowing backend selection (default: detected from the
desktop session). The `wayland` backend requires KDE Plasma 6 and integrates
with the compositor via a KWin script; `x11` keeps the legacy XWayland
behavior. Useful for troubleshooting.

Since this tool is built on top of Electron/Chromium,
it also inherits all [their command-line options](https://www.electronjs.org/docs/latest/api/command-line-switches).
