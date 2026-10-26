# Proposal: rewrite-readme-for-fork

## Why

`README.md` still presents the upstream Kvan7/Exiled-Exchange-2 project: the badges, the FAQ link, and the "The ONLY official download sites are kvan7.github.io / github.com/Kvan7" warning all point at upstream properties, and nothing on the page says what this fork adds or where its own releases live. Anyone landing on `ys-kalyakin/Exiled-Exchange-2` is directed to someone else's download locations and learns nothing about the fork's gamepad support, Wayland backend, or Linux builds.

## What Changes

- Rewrite `README.md` as the fork's front page (English, matching the repo's existing convention):
  - Replace the kvan7-pointing badges with fork-repo badges (latest release tag, total downloads for `ys-kalyakin/Exiled-Exchange-2`); drop the upstream `commits-since-dev` badge and the upstream Weblate translation badge — both describe upstream-only workflows.
  - Remove the "The ONLY official download sites …" warning and the kvan7 download-page link. Add a short Download section pointing at the fork's GitHub releases (`https://github.com/ys-kalyakin/Exiled-Exchange-2/releases`): Windows installer + portable `exe`, Linux `AppImage`, automatic-update feeds — all confirmed present on the published v0.16.3 release produced by the fork release pipeline.
  - Add a "What this fork changes" section covering: gamepad support (`gamepad-io`, `gamepadCombo` defaults `R3 + RT` price check / `L3 + RT` locked price check, B button toggles the overlay, gamepad navigation in overlay windows, 8BitDo Pro 2 profile, gamepad configuration UX); the native KDE Plasma 6 Wayland overlay backend (KWin bridge); Linux AppImage builds with auto-update; tag-driven fork release automation. State that macOS builds are not provided by this fork.
  - Keep the still-valid user content in place: "Moving from POE1/Awakened PoE Trade" migration steps, FAQ link, tool showcase, Development (DEVELOPING.md), Acknowledgments — with `Kvan7/Exiled-Exchange-2` added to the lineage/acknowledgments.
  - Remove upstream-owner-specific leftovers: the imgur download-stats graph.
- No code, build, or workflow changes.

## Capabilities

### New Capabilities

(none — this is a documentation-only change)

### Modified Capabilities

(none — no spec-level behavior changes; `.openspec.yaml` sets `skip_specs: true`)

## Impact

- Files: `README.md` only.
- Upstream mergeability: `README.md` is shared with upstream, and this is a deliberate full rewrite — future upstream merges will conflict in this file and need manual resolution. Mitigation: keep retained sections in upstream's order and wording wherever the content is unchanged, and confine fork-specific content to clearly bounded sections so merge conflicts stay localized. The trade-off is accepted on purpose: the README is the fork's front page and currently misdirects users.
- Gamepad feature / Linux (X11) support: no code impact; the README gains user-facing documentation of both.
- Assumptions: README stays in English (public repo, upstream convention, OpenSpec artifacts are English per project context). FAQ/docs links keep pointing at the upstream docs site (`kvan7.github.io/Exiled-Exchange-2/faq`) because the fork's own Pages site is not deployed (verified 404 on 2026-10-27) and the docs content is identical.

## Out of Scope

- `docs/` site content and `docs/.vitepress/config.js` — the download page, `releasesUrl`, and social links still point at Kvan7 (known follow-up once the fork's own docs deployment exists).
- Enabling the fork's GitHub Pages deployment (`pages.yml` exists but the site is not live).
- Translated (non-English) README variants.
- Release workflow or electron-builder changes.
