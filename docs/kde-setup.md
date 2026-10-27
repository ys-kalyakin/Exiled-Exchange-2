---
title: KDE Plasma 6 Wayland setup
---

# KDE Plasma 6 Wayland setup

On KDE Plasma 6 Wayland the app runs its native Wayland backend: game window
tracking, overlay placement and global shortcuts are handled through a KWin
script, and clipboard access while the game is focused goes through KDE
Klipper (with a `wl-clipboard` fallback). X11 sessions are not affected and
need none of the steps on this page.

What is left to manual setup on Wayland is **input injection** — the actions
that send keys into the game (Copy Item, Paste-in-Chat, Stash Search). On the
Wayland backend they go through the external
[ydotool](https://github.com/ReimuNotMoe/ydotool) helper: until the `ydotool`
binary is installed and its `ydotoold` daemon is running, these actions are
disabled and the app shows a
*"Input injection helper (ydotool) is not running - Copy Item, Paste-in-Chat
and Stash Search are disabled"* notice instead of failing silently.

## 1. Install ydotool

The app speaks the ydotool 1.x daemon protocol, so you need **ydotool 1.0.4
or newer** (check with `ydotool --version`). Some releases package the
pre-1.0 version (0.1.8), which this app cannot use.

Example commands — package details vary by distro and release:

- **Arch / Manjaro** — `sudo pacman -S ydotool`
  (ships a systemd user service and a udev uinput rule)
- **Fedora** — `sudo dnf install ydotool`
  (ships a **system** service named `ydotool.service` and no uinput rule;
  with the default root-owned `0600` socket the app cannot connect — see
  "System-wide daemon" below before you enable it)
- **openSUSE (Tumbleweed)** — `sudo zypper install ydotool`
  (ships a user service but no uinput rule, see step 3)
- **Debian 14 (forky) and newer, Debian testing** — `sudo apt install ydotool`
  (ships a user service and a uinput rule)
- **Debian 13 (trixie)** — trixie has no ydotool package; enable
  `trixie-backports`, then `sudo apt install -t trixie-backports ydotool`
- **Ubuntu** — `sudo apt install ydotool` from 26.04 on; older releases
  (25.10 and earlier) carry 0.1.8, too old for this app
- **Any other distribution** — install `ydotool` from your package manager
  (1.0.4+) or build it from
  [upstream](https://github.com/ReimuNotMoe/ydotool); do not mix in an older
  daemon

## 2. Start `ydotoold`

Since ydotool 1.0 the daemon is mandatory: it holds a persistent virtual
uinput device, and the `ydotool` client sends commands to it over a socket.
The app looks for the daemon socket (in this order) when it decides whether
injection is available:

1. `$YDOTOOL_SOCKET` (environment override, set before launching the app)
2. `$XDG_RUNTIME_DIR/ydotool.socket`
3. `$XDG_RUNTIME_DIR/ydotoold.socket`
4. `$XDG_RUNTIME_DIR/.ydotool_socket` — **the default** for a user session
5. `/tmp/.ydotool_socket` — the fallback default when `XDG_RUNTIME_DIR` is
   not set
6. `/run/ydotoold.socket`

### Recommended: the packaged user service

Most distro packages install a systemd **user** unit. Enable it (Arch and
Debian-family packages name it `ydotool.service`; when built from upstream
sources it is `ydotoold.service`):

```sh
systemctl --user enable --now ydotoold.service
```

If that name fails, list what the package installed with
`systemctl --user list-unit-files | grep -i ydotool` and enable that one.
This leaves the socket at the user-session default
`$XDG_RUNTIME_DIR/.ydotool_socket`, which the app probes.

### Alternative: your own user unit

If your package ships no service unit, create
`~/.config/systemd/user/ydotoold.service`:

```ini
[Unit]
Description=ydotoold input injection daemon

[Service]
ExecStart=/usr/bin/ydotoold
Restart=always

[Install]
WantedBy=default.target
```

Then:

```sh
systemctl --user daemon-reload
systemctl --user enable --now ydotoold.service
```

As above, the socket ends up under `$XDG_RUNTIME_DIR`, which the app probes.

### System-wide daemon (advanced)

If you run the daemon as a system service (`sudo systemctl enable --now
ydotoold.service`) instead, beware: `ydotoold` creates its socket with
permission `0600` (owner-only) by default. Without `XDG_RUNTIME_DIR` its
socket default is `/tmp/.ydotool_socket`, owned by root — the app could
connect to the file but the `ydotool` client it spawns would be refused.
Start it with a shared socket path and permission, e.g. in the unit:

```ini
ExecStart=/usr/bin/ydotoold --socket-path /run/ydotoold.socket --socket-perm 0666
```

`/run/ydotoold.socket` is also probed by the app. Fedora's package installs
exactly such a `ydotool.service` system unit — edit its `ExecStart` line to
add the two options above.

## 3. Grant uinput access

`ydotoold` drives the virtual device through `/dev/uinput`. A system-wide
(root) daemon can use it directly, but a user-session daemon needs access:

1. Arch's and Debian's 1.0.4 packages install
   `/usr/lib/udev/rules.d/80-uinput.rules` for you: check whether it exists.
   Fedora's and openSUSE's packages and manual builds ship no rule.
2. If it is missing, create `/etc/udev/rules.d/80-uinput.rules`:

   ```
   KERNEL=="uinput", GROUP="input", MODE="0660", OPTIONS+="static_node=uinput"
   ```

3. Add yourself to the `input` group and log out/in so it takes effect:

   ```sh
   sudo usermod -aG input "$USER"
   ```

4. Apply the rule (or just reboot):

   ```sh
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

5. If `/dev/uinput` does not exist, load the module: `sudo modprobe uinput`,
   and for autoload across reboots `echo uinput | sudo tee
   /etc/modules-load.d/uinput.conf`.

## 4. Verify

- `command -v ydotool` finds the binary — the app resolves it the same way
  (through `PATH`). If you built it yourself, put it where the app's `PATH`
  reaches it (`/usr/bin` is safest).
- `ydotool --version` reports 1.0.4 or newer.
- The socket file exists, e.g. `ls -l "$XDG_RUNTIME_DIR/.ydotool_socket"` —
  or the custom path you passed to `ydotoold` (match it with `YDOTOOL_SOCKET`
  when non-standard: set `YDOTOOL_SOCKET=/path/to/socket` in the
  environment you launch the app from).
- Restart Exiled Exchange 2: helper detection runs once per app start, so a
  daemon started afterwards only takes effect on the next launch. The notice
  disappears and Copy Item, Paste-in-Chat and Stash Search come back.
- Smoke test injection outside the game: `ydotool key 30:1 30:0`
  (press-and-release of the A key) into any text field.

## Wayland limitations

These are inherent to the Wayland session, not part of the ydotool setup:

- **Ctrl + MouseWheel stash scrolling does not work** — the app cannot
  capture global mouse wheel events on Wayland, and the settings page
  reports the feature as unavailable there.
- **Clipboard access while the game is focused** goes through KDE Klipper,
  with the `wl-clipboard` binaries (`wl-copy`/`wl-paste`) as a fallback —
  install the `wl-clipboard` package if the fallback channel is needed.
- **Use the game's Windowed (Borderless) Fullscreen display mode.**
  Activating the overlay needs to deactivate the game on Wayland; with
  exclusive-fullscreen (XWayland) games that un-fullscreens or minimizes the
  game.
- If the compositor integration does not work for you, you can fall back to
  the legacy XWayland mode by launching the app with
  `--overlay-backend=x11` — key injection then uses the old X11 hook again
  and ydotool is not needed.
