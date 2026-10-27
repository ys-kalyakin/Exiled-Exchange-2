# Tasks

## 1. Point docs references at the fork

- [x] 1.1 `docs/faq.md`: rewrite the "official website / repository" answer so the fork's Pages site and `ys-kalyakin/Exiled-Exchange-2` are the current project home, upstream is named as the original project this fork is based on, and the mirror/anti-fake warning is kept. Verify: `grep -i "kvan7.github.io" docs/faq.md` finds no "only official" claim, and the FAQ names the fork site and repo.
- [x] 1.2 `docs/.vitepress/config.js`: change the header social link to `https://github.com/ys-kalyakin/Exiled-Exchange-2`, keep `releasesUrl` and everything else as-is. Verify: a `node` eval of the config prints the fork link in `socialLinks` and the fork `releasesUrl`.
- [x] 1.3 `docs/item-data.md`: repoint the `LargeDemo.csv` sample link to `https://raw.githubusercontent.com/ys-kalyakin/Exiled-Exchange-2/master/docs/.vitepress/LargeDemo.csv`. Verify: fetching the new URL returns 200 and the file exists in the fork at that path.
- [x] 1.4 `README.md`: make the FAQ section link to `https://ys-kalyakin.github.io/Exiled-Exchange-2/faq`. Verify: the link text point at the fork docs URL, and the README still contains the artifact-name pattern the version hook greps (no `versionCheck.py` regression).

## 2. Build and consistency checks

- [x] 2.1 Build the docs site locally (`npm install` in `docs/` if needed, then `npm run build`). Verify: build succeeds; `docs/.vitepress/dist/download.html` shows the version from `main/package.json` and release links only under `ys-kalyakin`; `dist/faq.html` presents the fork as home.
- [x] 2.2 Run `python versionCheck.py` from the repo root. Verify: "Version check passed" (config without a literal is accepted).
- [x] 2.3 CI-parity checks (`cd renderer && npm run lint && npm run check-types && npm run test`; `cd ../main && npm run lint && npm run check-types`). Verify: all pass — no app source files are touched, so no changes are expected.

## 3. Deploy and live verification

- [ ] 3.1 Push the change to `master` and trigger the `Docs` workflow via `workflow_dispatch`. Verify: run succeeds on GitHub Actions.
- [ ] 3.2 Verify the live site serves the corrected content. Verify: `https://ys-kalyakin.github.io/Exiled-Exchange-2/faq` names the fork, the rendered header link and download links target fork URLs, and the README-on-`master` FAQ link opens this site.

## Workflow follow-up

- After implementation review, sync/archive the change so the `docs-site` master spec is created.
