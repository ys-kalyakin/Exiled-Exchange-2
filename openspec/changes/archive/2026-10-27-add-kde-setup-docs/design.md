# Design

## Context

The documentation surfaces this change touches: `README.md` (upstream-shared, already carries fork-specific sections incl. "Linux support"), the VitePress site (`docs/`, MPA, sidebar in `docs/.vitepress/config.js` lines 38–67, built with `npm run build` in `docs/`, deployed by `.github/workflows/pages.yml`), and the cross-link targets `docs/download.md` / `docs/issues.md` (both upstream-shared). The behavior being documented is already implemented: backend detection (`main/src/windowing/kwin/index.ts` — Wayland iff `XDG_SESSION_TYPE=wayland` and `WAYLAND_DISPLAY`, or `--overlay-backend` override), injection-helper gating (`main/src/shortcuts/InputInjector.ts` — binary on `PATH` + socket probe order, availability exposed to shortcuts), degraded actions (`main/src/shortcuts/Shortcuts.ts` — stash-search error path, `stashScrollSupported: !isWaylandBackend()`), and Wayland clipboard (`main/src/shortcuts/HostClipboard.ts`, `WaylandClipboard.ts` — Klipper DBus with wl-clipboard fallback). The archived `add-kde-wayland-overlay` design explicitly chose "documented instead of bundling/automating" for ydotool and uinput permissions — this change delivers that promised documentation. Spec-level treatment follows the `docs-fork-references` precedent: user-facing doc content is spec-able, so the delta introduces `linux-setup-docs` rather than `skip_specs`. See proposal.md for motivation and scope.

## Goals / Non-Goals

**Goals:**

- A single source of truth for KDE Plasma 6 Wayland setup (new `docs/kde-setup.md`), accurate to the implemented detection/gating behavior.
- Setup information visible in both doc surfaces: GitHub (README) and the site (page + cross-links), per the specs.
- Minimal, localized edits to upstream-shared files, in upstream style, to keep future merges low-friction.

**Non-Goals:**

- No code, i18n-string, dependency, build-pipeline, or workflow changes (specified in proposal Impact).
- No bundling/packaging of ydotool or automation of uinput permissions (explicit upstream-era design decision).
- No docs theming, no translation work, no macOS/GNOME coverage.

## Decisions

1. **Dedicated page `docs/kde-setup.md` with a sidebar entry, not expanding `issues.md`/`download.md`.** Setup is multi-step (install → daemon → uinput → verify); issues.md is a troubleshooting list and download.md holds a brief requirements table. A dedicated page linked from those places keeps one source of truth and keeps upstream-shared pages' diffs to one-line link additions. Alternative considered (write everything into issues.md / download.md): rejected — bloats troubleshooting/onboarding pages and duplicates content later.
2. **Both ydotoold routes, with the distro system unit as the recommended default.** The app already probes both `/run/ydotoold.socket` (system daemon) and `$XDG_RUNTIME_DIR` sockets (user daemon) — `InputInjector.findYdotooldSocket()` — so both end-user routes must be documented. Distro units are one command (`systemctl enable --now ydotoold`) and handle uinput because the daemon runs with the needed access; the user-unit route needs an explicit udev rule (or `input` group) and is documented secondary. Alternative (document only one route): rejected — locks users out of a route the app explicitly supports.
3. **Package commands: four distro families + generic fallback, presented as examples.** Arch, Debian/Ubuntu, Fedora, openSUSE commands, each labeled "example — package management varies by distro version", plus an equivalent for unlisted distros. Exact package/unit naming (`ydotool` vs separate `ydotoold` package, system unit name) varies by distro and version, so the page teaches the invariant (install `ydotool`, run `ydotoold`, expose socket) with concrete examples. Alternative (link only to upstream ydotool README): rejected — unusable as setup docs.
4. **Placement in sidebar group 1 (after "Quick Start").** Onboarding-flow placement (Download → Quick Start → KDE setup) matches when a Linux user needs it; one-line addition to the already-fork-diverged `config.js`.
5. **README: short paragraph in the existing "Linux support" subsection + link.** README already diverges upstream in exactly that section, so a 3–4 line install/run-`ydotoold` summary (not full steps) keeps GitHub readers served without duplicating the page.
6. **Accuracy guardrails in tasks.** Every factual claim in the page maps to a code citation (probe order, disabled actions, backend detection, stash-scroll availability flag); verification tasks include grep checks against `main/src/...` paths, matching the docs-fork-references verification style. The in-app notice text (`app_i18n.json`) stays untouched.
7. **Game display-mode guidance repeats what issues.md already asserts** (Windowed (Borderless) Fullscreen on Wayland; exclusive-fullscreen XWayland un-fullscreens the game) — carried over verbatim in meaning, so README/issues/FAQ/page do not contradict each other.

## Risks / Trade-offs

- [Distro package/unit details drift over time] → commands labeled as examples + generic fallback + an implementation task to verify package names against current distros before publish.
- [AppImage users: helper not found even when installed] → document the two conditions the app checks explicitly (`ydotool` on `PATH` via `command -v ydotool`; daemon socket reachable) so users can self-diagnose; note `$YDOTOOL_SOCKET` override for non-standard sockets.
- [Upstream merge friction on `README.md` / `config.js` / `download.md` / `issues.md`] → keep every shared-file edit to one localized block; new page is a fork-only file with no upstream counterpart.
- [Docs build regression (broken front-matter/links)] → tasks require a local `npm run build` in `docs/` and manual link checks; `versionCheck.py` is untouched (README's artifact-name strings remain).
- [Documenting behavior not actually implemented (overpromising)] → each claim grounded in the code citations listed in Context; verification greps pin probe order and disabled-action list to `main/src/shortcuts/InputInjector.ts`.

## Migration Plan

Single documentation commit; site deploys through the existing Docs workflow (`docs/**` trigger in `pages.yml`). No rollback beyond reverting the commit; no data or settings migration.

## Open Questions

None — distro-specific package details are handled in-page as examples and verified during implementation (decision 3), which does not change the specs or task breakdown.
