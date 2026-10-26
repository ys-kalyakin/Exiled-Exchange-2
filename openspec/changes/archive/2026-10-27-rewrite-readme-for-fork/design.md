# Design

## Context

The current `README.md` is the upstream Kvan7 README with no fork awareness: kvan7 badges (specific-release download counter, tag, commits-since-`dev`, Weblate), the "ONLY official download sites" warning, an FAQ link to the upstream docs, the APT migration steps, the tool showcase, DEVELOPING.md, acknowledgments, and an imgur stats graph. Motivation is in [proposal.md](./proposal.md) — Why.

Grounded facts this design builds on (verified 2026-10-27):

- The fork has a published release `v0.16.3` on `ys-kalyakin/Exiled-Exchange-2` with assets: `Exiled-Exchange-2-Setup-0.16.3.exe` (installer), `Exiled-Exchange-2-0.16.3.exe` (portable), `Exiled-Exchange-2-0.16.3.AppImage` (Linux), plus `latest.yml` / `latest-linux.yml` auto-update feeds — produced by `.github/workflows/release.yml` + `main/electron-builder.fork.yml` (publish target `ys-kalyakin/Exiled-Exchange-2`, draft release on tag).
- The fork's own docs site (`pages.yml` → `ys-kalyakin.github.io/Exiled-Exchange-2/`) is not deployed (HTTP 404); `docs/.vitepress/config.js` still points `releasesUrl`/social links at Kvan7.
- Fork features to document: gamepad support (`gamepad-io`, `gamepadCombo` defaults `R3 + RT` price check / `L3 + RT` locked price check, B toggles the overlay, in-window gamepad navigation across overlay windows, 8BitDo Pro 2 profile, gamepad configuration UX — see `docs/gamepad-roadmap.md` and the `gamepad-navigation` master spec), native KDE Plasma 6 Wayland overlay backend (KWin script bridge — `wayland-overlay-backend` spec), Linux AppImage builds with auto-update, tag-driven release automation. Windows-first, Linux-second, no macOS.

## Goals / Non-Goals

**Goals:**

- A README that a visitor to the fork repo can act on: what this fork is, what it adds, where to download its builds, how it relates to upstream.
- Merge-friendly layout: retained upstream content keeps upstream's section order and wording; fork-specific content lives in clearly bounded sections.
- Links and badges that do not rot on every release.

**Non-Goals:**

- Fixing `docs/` content or `docs/.vitepress/config.js` (still upstream-pointing) — follow-up change.
- Enabling the fork's GitHub Pages site.
- Translated README variants; release workflow changes; any code changes.

## Decisions

1. **Single-file rewrite of `README.md` in English, preserving upstream structure for retained content.** Sections kept in upstream order: title/intro → badges → migration → FAQ → showcase → Development → Acknowledgments. Fork-specific blocks inserted at bounded points: a "What this fork changes" section right after the intro, a "Download" section replacing the "ONLY official download sites" warning, and one lineage line ("Fork of Kvan7/Exiled-Exchange-2, which is a fork of Awakened PoE Trade"). Rationale: keeps future upstream merge conflicts localized to the blocks that intentionally differ. Alternative — a from-scratch fork-only README — rejected: it would discard still-accurate user help (migration, showcase) and maximize divergence. One intentional exception to verbatim retention: migration step 1's "Download latest release" link points at the fork's releases instead of upstream's — a link directing this fork's users to upstream downloads would contradict the change's purpose (and the download-references rule above); the rest of the migration block stays verbatim.

2. **Badges: tag + total downloads for the fork repo; drop the rest.** Use `img.shields.io/github/v/tag/ys-kalyakin/exiled-exchange-2` and `img.shields.io/github/downloads/ys-kalyakin/exiled-exchange-2/total`. Rationale: upstream's specific-asset download badge hardcodes `Exiled-Exchange-2-Setup-0.16.3.exe`, so it silently breaks every release (and its casing already disagrees with `docs/download.md`); the tag and total badges are stable across releases. The `commits-since-…/dev` badge describes the upstream dev branch and the Weblate badge the upstream translation platform — both dropped. Alternative: dynamic JSON badges via the GitHub API — rejected as unnecessary complexity.

3. **Download section links pages, not pinned assets.** Link `https://github.com/ys-kalyakin/Exiled-Exchange-2/releases` (and `releases/latest`), and describe the artifact kinds (Windows installer, portable exe, Linux AppImage, auto-update feeds) with asset names shown as concrete "as of v0.16.3" examples. Rationale: versioned asset URLs rot on every release, and the README cannot use the docs theme's `theme.appVersion` templating that `docs/download.md` relies on. One hard constraint keeps the installer filename versioned in the Download section: `versionCheck.py` (the pre-commit version-consistency hook) requires the literal `Exiled-Exchange-2-Setup-<version>` in README.md to match the package version, so release version bumps must update the README example — the hook enforces that consistency repo-wide (it already does this for the bug-report template and the docs config). Include the unsigned-binary note and state that macOS builds are not provided.

4. **Docs/FAQ links keep pointing at the upstream docs site.** `https://kvan7.github.io/Exiled-Exchange-2/faq` stays because the fork's Pages deployment is not live and the content is identical. Repointing to the fork's own docs is part of the future docs/Pages follow-up, not this change.

5. **"What this fork changes" stays feature-level.** Describe what a user gets (gamepad combos and navigation, Wayland overlay on KDE, AppImage + auto-update, tag-driven releases), not implementation internals; link `docs/gamepad-roadmap.md` and DEVELOPING.md for depth. Grounded in the project context, the `gamepad-navigation` / `wayland-overlay-backend` master specs, and the release workflow.

6. **Remove the imgur stats graph** (upstream's download stats). Keep the in-repo showcase images (`docs/reference-images/`).

## Risks / Trade-offs

- [Upstream merges of `README.md` now conflict] → Retained sections keep upstream's wording and order; fork-specific content is confined to bounded sections; conflicts are then localized and mechanical. Accepted trade-off per the proposal.
- [Release artifact shape may change (names, feeds)] → Badges and links are shape-independent (tag/total/releases-page); asset names appear only as dated examples.
- [Upstream docs URLs move or content diverges for fork users] → Same exposure as today; resolved by the future fork-docs follow-up.
- [Feature list drifts from reality] → The section is anchored to existing specs and `docs/gamepad-roadmap.md`, which are the sources of truth updated by the OpenSpec workflow.

## Migration Plan

Docs-only, single commit on `master`; rollback is `git revert`. No deployment step (README renders on GitHub).

## Open Questions

None.
