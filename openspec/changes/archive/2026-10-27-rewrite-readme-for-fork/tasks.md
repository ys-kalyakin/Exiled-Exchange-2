# Tasks

## 1. Rewrite README header and fork description

- [x] 1.1 Rewrite the header block: keep the title/logo and one-line app description, replace the "Fork of Awakened PoE Trade" line with the full lineage (fork of Kvan7/Exiled-Exchange-2, itself a fork of Awakened PoE Trade), and swap the kvan7 badges for fork-repo badges — `img.shields.io/github/v/tag/ys-kalyakin/exiled-exchange-2` (latest tag) and `img.shields.io/github/downloads/ys-kalyakin/exiled-exchange-2/total` (total downloads) — dropping the commits-since-dev, specific-asset-download, and Weblate badges per design decision 2. Verify: each badge image URL returns HTTP 200 (`curl -sI`) and renders the fork's values.
- [x] 1.2 Add the "What this fork changes" section directly after the intro, kept feature-level per design decision 5: gamepad support (`gamepad-io`; `gamepadCombo` defaults `R3 + RT` price check / `L3 + RT` locked price check; B button toggles the overlay; gamepad navigation in overlay windows; 8BitDo Pro 2 profile; gamepad configuration UX), native KDE Plasma 6 Wayland overlay backend (KWin bridge), Linux AppImage builds with automatic updates, tag-driven release automation, and an explicit note that macOS builds are not provided. Link `docs/gamepad-roadmap.md` and `DEVELOPING.md` for depth. Verify: every claim matches the project context, `docs/gamepad-roadmap.md`, and the `gamepad-navigation` / `wayland-overlay-backend` master specs; all relative links resolve to files in the repo.

## 2. Rework download and retained sections

- [x] 2.1 Replace the "The ONLY official download sites …" warning with a Download section per design decision 3: link `https://github.com/ys-kalyakin/Exiled-Exchange-2/releases` (and `/releases/latest`), describe artifact kinds (Windows installer + portable `exe`, Linux `AppImage`, `latest.yml` / `latest-linux.yml` auto-update feeds), mention asset names only as "as of v0.16.3" examples, add the unsigned-binary note, and state macOS is not built. Verify: `grep -n "kvan7\|Kvan7" README.md` shows Kvan7 references only in the lineage line, acknowledgments, and the upstream docs/FAQ links kept per design decision 4; the release URLs return HTTP 200.
- [x] 2.2 Keep the retained sections in upstream order and wording — "Moving from POE1/Awakened PoE Trade", FAQ link, Tool showcase, Development (DEVELOPING.md), Acknowledgments with `Kvan7/Exiled-Exchange-2` added to the list — and remove the imgur stats graph per design decisions 1 and 6. Verify: the migration and showcase blocks are unchanged from the pre-change text except the one allowed amendment (migration step 1's release link points at the fork's releases, per design decision 1); the acknowledgments list includes Kvan7/Exiled-Exchange-2; no imgur link remains.

## 3. Verification

- [x] 3.1 Run `pre-commit run --files README.md` (trailing-whitespace, end-of-file-fixer, version-consistency hooks) and fix any findings. Verify: all hooks pass on the file.
- [x] 3.2 Confirm no collateral damage to shared tooling (project rule): from `renderer/` run `npm run lint`, `npm run check-types`, `npm run test`; from `main/` run `npm run lint`, `npm run check-types`. Verify: all pass (README-only change, expected green).
- [x] 3.3 Final visitor read-through: no upstream-only download instructions or kvan7 badges remain, the fork features and download path are accurate against the published v0.16.3 release assets, and the page reads as the fork's own front page. Verify: checklist above confirmed on the rendered GitHub view or locally rendered markdown.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Follow-up change (not this one): repoint `docs/.vitepress/config.js` and `docs/download.md` at the fork and enable the fork's GitHub Pages deployment.
