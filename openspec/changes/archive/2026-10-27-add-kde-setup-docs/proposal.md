# Proposal

## Why

The fork's KDE Plasma 6 Wayland support is implemented and specced (`wayland-overlay-backend`), and the in-app notice for missing injection says "Install the ydotool package and start ydotoold" — but the promised setup documentation ("documented instead" of bundling/automating, per `add-kde-wayland-overlay` design) was never written. A KDE Wayland user who follows the current README/download/issues docs gets no instructions for installing ydotool, starting `ydotoold`, granting it uinput access, or the Wayland-specific game settings, so Copy Item / Paste-in-Chat / Stash Search stay disabled and they cannot tell misconfiguration from breakage.

## What Changes

- Add a new documentation page `docs/kde-setup.md` ("KDE Plasma 6 Wayland setup") to the VitePress site covering, grounded in actual behavior (`main/src/shortcuts/InputInjector.ts`, `main/src/windowing/kwin/`):
  - what the Wayland backend does automatically and what it requires (KDE Plasma 6, `--overlay-backend` override);
  - installing the `ydotool` package for major distro families (Arch / Debian- and Ubuntu-based / Fedora, with a generic command for others);
  - starting `ydotoold` (distro system service producing `/run/ydotoold.socket`, or a systemd **user** unit producing a socket under `$XDG_RUNTIME_DIR`), and uinput access for it (udev rule / `input` group);
  - how the app detects the helper (socket paths probed, including `$YDOTOOL_SOCKET`), verifying it works, and what the disabled-actions notice means;
  - Wayland-session limitations and recommendations: no global Ctrl+MouseWheel stash scroll, Klipper clipboard with wl-clipboard fallback, Windowed (Borderless) Fullscreen instead of exclusive XWayland fullscreen, and `--overlay-backend=x11` as the X11 fallback.
- Register the page in the docs-site sidebar (`docs/.vitepress/config.js`).
- Add a short KDE Wayland setup subsection to `README.md` under "Linux support (X11 and KDE Plasma 6 Wayland)" (install ydotool + run ydotoold + uinput access) with a link to the full page.
- Link the new page from `docs/issues.md` (Linux section) and `docs/download.md` (requirements), so existing troubleshooting paths lead to it.

## Capabilities

### New Capabilities

- `linux-setup-docs`: Documentation requirements for setting up this fork on Linux — the README Linux setup information and the VitePress KDE-setup page must present the KDE Plasma 6 Wayland prerequisites (ydotool install, `ydotoold` startup, uinput access), the helper-detection mechanics the app actually implements, Wayland limitations, and cross-links from download/issues pages. Owned surfaces: `README.md`, `docs/kde-setup.md`, `docs/.vitepress/config.js`, `docs/download.md`, `docs/issues.md`.

### Modified Capabilities

(none — `wayland-overlay-backend` describes app runtime behavior, which this change does not alter; `docs-site` does not yet exist in master specs, see docs-fork-references)

## Impact

- **Files touched (all documentation, no code):**
  - New: `docs/kde-setup.md` (fork-only file, no upstream counterpart → no merge conflicts).
  - Modified: `README.md`, `docs/.vitepress/config.js`, `docs/download.md`, `docs/issues.md` — upstream-shared files; edits stay minimal, localized, and in upstream style (prettier, plain markdown) to keep future upstream merges low-friction; `README.md` and `docs/.vitepress/config.js` already carry localized fork divergence, so this extends the existing pattern rather than creating a new one.
- **No code, dependency, build-pipeline, or workflow changes**; `pages.yml`, `versionCheck.py` (README "artifact-name" grep rule must keep passing), and the app itself are untouched.
- **Gamepad feature**: unaffected (docs-only); no spec or code for `gamepad-navigation` changes.
- **Linux support**: docs-only; does not change X11 or Wayland behavior, only documents what `wayland-overlay-backend` already implements.
- **Out of scope**: bundling or packaging ydotool; automating uinput permission setup; GNOME or other-Wayland-compositor support; macOS docs; AppImage content changes; changes to the in-app notice strings or i18n files; docs translation work.
