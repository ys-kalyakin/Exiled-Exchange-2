---
title: Common issues
---

1. Read the [requirements](/download) again.

    Please do it. Did you know that updating Geforce Experience can reset game
    video settings to "optimized profile" and silently enable Fullscreen mode?

2. [Check the logs](/faq).

3. Are you playing with Vulkan renderer? Update GPU drivers.

    If EE2 works for you with DirectX11/12 renderer,
    then problem is old Vulkan drivers for sure.

4. Delete `%appdata%\exiled-exchange-2`

    If needed, backup `apt-data` folder with your configuration inside.

5. **Close all applications** that you can in tray and task manager.

    Launch them later one at a time to identify **conflict**.

6. Restart Exiled Exchange 2.

    *(don't forget to quit first, otherwise launching second instance will do nothing).*

7. As last resort, go to Discord. But if you don't describe something specific about
    your problem, **you will most likely be directed to this page**.

---

- 🔥[There are no stats to select from when price checking](/no-item-mods)
- [Failed to load leagues](/failed-load-leagues)
- [How to remove the stopwatch in center of screen?](https://github.com/SnosMe/awakened-poe-trade/issues/219)
- [Sends a whisper when doing price-check](https://github.com/SnosMe/awakened-poe-trade/issues/178)

## PoE2

- 🔥[Query is too complex](/complex-query)
- 🔥[Unexpected token ..... is not valid JSON](/invalid-json)

## Windows

- 🔥[Nothing happens when I try to price check](/nothing-happens)
- [Can't open settings via tray icon when game is active](https://github.com/SnosMe/awakened-poe-trade/issues/265)

## Linux

- [Tray icon is not shown](https://github.com/SnosMe/awakened-poe-trade/issues/106)
- 🔥[Screen is black](https://github.com/SnosMe/awakened-poe-trade/issues/185)
- [Some issues with running in Wayland](https://github.com/Kvan7/Exiled-Exchange-2/issues/673)

On KDE Plasma 6 Wayland sessions the app runs a native Wayland backend
(KWin script + DBus bridge), which no longer requires forcing XWayland.
Actions that inject input into the game (Copy Item, Paste-in-Chat, Stash
Search) need the [ydotool](https://github.com/ReimuNotMoe/ydotool) helper
(`ydotoold` running); without it they are disabled with a notice. Stash
scrolling (Ctrl + MouseWheel) is unavailable on Wayland. Clipboard access
while the game is focused goes through KDE Klipper (with a wl-clipboard
fallback). Use the game's Windowed (Borderless) Fullscreen display mode:
activating the overlay needs to deactivate the game on Wayland, and with
exclusive fullscreen XWayland games that un-fullscreens (or minimizes)
the game. Use `--overlay-backend=x11` to fall back to the X11 mode.

For installing `ydotool`, starting `ydotoold` and the uinput permissions,
see the [KDE Plasma 6 Wayland setup](/kde-setup) page.
