# Proposal

## Why

The fork's documentation site (VitePress in `docs/`, deployed by `.github/workflows/pages.yml` to this fork's GitHub Pages) was recently fixed to target this fork instead of upstream: site version now comes from `main/package.json`, `releasesUrl` points at `ys-kalyakin/Exiled-Exchange-2`, and download links were updated to the fork's artifact names; the pipeline (`npm ci` + `npm run build`) is verified working — the latest `Docs` run succeeded and the live site serves fork content for the published `v0.16.4` release. However, an audit shows several user-facing references still send readers to the **upstream repository/site**: the FAQ claims the only official website/repo is upstream's, the site header "GitHub" social link points to upstream, the README FAQ section links to the upstream docs site, and `docs/item-data.md` links the `LargeDemo.csv` sample from the upstream repo. Visitors following the fork's documentation are thus directed to the wrong repository for downloads and help, which contradicts the fork-distribution model already specified in `release-automation` (the fork publishes releases and fork-built apps self-update from them).

## What Changes

- Update the remaining user-facing documentation references from upstream (`Kvan7/Exiled-Exchange-2`, `kvan7.github.io`) to the fork:
  - `docs/faq.md` — the "official website and repository" answer must describe the fork's own site and repository (crediting upstream) instead of naming upstream's as the only ones.
  - `docs/.vitepress/config.js` — the header "GitHub" social link must point at the fork repository (consistent with `releasesUrl`, already pointing to the fork).
  - `docs/item-data.md` — the `LargeDemo.csv` raw link must point at the fork repo (the file exists in the fork at the same path).
  - `README.md` — the FAQ section must link the fork's own docs site FAQ instead of the upstream one.
- Codify the finished docs-deploy behavior as a new `docs-site` capability spec (trigger/provenance of the Pages deployment, version sourced from `main/package.json`, download links resolving to fork release artifacts, and fork-only repository references), so the completed fix is documented and future edits stay consistent.
- No pipeline changes: `pages.yml`, release workflow, and `versionCheck.py` are verified working and stay untouched. The already-done parts (deployment, version source, `releasesUrl`, artifact names, macOS row removal) are covered by the new spec rather than re-implemented.

## Capabilities

### New Capabilities

- `docs-site`: The fork's VitePress documentation site — how it is built and deployed to the fork's GitHub Pages, where it sources its version, and what it must point users at (fork releases and repositories; Windows/Linux artifact names only).

### Modified Capabilities

(none)

## Impact

- Files touched: `docs/faq.md`, `docs/.vitepress/config.js`, `docs/item-data.md`, `README.md` — all small, localized string/link edits.
- **Shared with upstream**: all four files exist upstream and are upstream-shared. Edits are minimal one-line diffs kept in upstream's prettier/2-space style, so future merges remain low-friction; `docs/.vitepress/config.js` and `docs/download.md` already diverge slightly in this area (fork release links), so this continues an already-localized divergence.
- **Gamepad / Linux**: no effect — this is documentation-only; the gamepad feature and Linux/X11 support are not touched.
- Out of scope: release/sync of specs, the `Docs`/`Release` workflows, `versionCheck.py`, the upstream `google-site-verification` meta token (inert here, left as-is to minimize divergence), attribution links (README "fork of" line, acknowledgments, historical Awakened PoE Trade issue links, the upstream Wayland issue #673 context link in `issues.md`), and the GitHub issue-template links routing to upstream discussions/issues (a routing-policy question, follow-up if desired).
