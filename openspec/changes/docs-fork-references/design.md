# Design

## Context

The docs-deploy fix (commit `9f37fb44`) moved the site onto fork infrastructure and is verified: docs lockfile is tracked, the latest `Docs` run deployed successfully, the live site serves fork links/version, and the fork's published `v0.16.4` release carries exactly the artifact names the site links (`Exiled-Exchange-2-Setup-0.16.4.exe`, `Exiled-Exchange-2-0.16.4.exe`, `Exiled-Exchange-2-0.16.4.AppImage`). Commit `fad21ac5` adapted `versionCheck.py` to the version no longer being a literal in `docs/.vitepress/config.js`; the hook's remaining checks (README, bug-report template, `main/package.json`, `main/package-lock.json`) still apply. Remaining wrong-repository references found by the audit: `docs/faq.md` ("only official website is kvan7.github.io"), `docs/.vitepress/config.js` social link, `docs/item-data.md` `LargeDemo.csv` raw link, `README.md` FAQ link. See `specs/docs-site/spec.md` for the target behavior.

## Goals / Non-Goals

**Goals**

- Point every user-facing docs/README reference that offers downloads or the "project home" at the fork.
- Lock the completed docs-deploy behavior into a new `docs-site` spec so later edits can't silently drift back upstream.
- Keep upstream-shared file divergence minimal and localized.

**Non-Goals**

- Any change to the Docs/Release workflows, docs build tooling, or `versionCheck.py`.
- Repointing GitHub issue-template links that route readers to upstream discussions/issues (upstream remains the right venue for many bug reports; changing this is a routing-policy decision, possible follow-up).
- Editing attribution/context links ( README "fork of" line, acknowledgments, historical Awakened PoE Trade issue links, the upstream Wayland issue #673 link in `issues.md`).
- Removing the upstream `google-site-verification` meta token from `config.js` (inert on the fork; removing it would diverge an upstream-shared line for zero user benefit).

## Decisions

1. **Leave the verified pipeline untouched.** The audit found `pages.yml`, trigger paths, lockfile, and build steps working end-to-end. Alternative — touching the workflow (e.g., removing the `docs/**` path filter) — was rejected: no fix is needed, and widening triggers only adds runs.

2. **Reference policy: change 4, keep the rest.** Only references that *offer downloads, help, or the project link* move to the fork (FAQ home answer, site header link, README FAQ link, demo CSV); references that *credit or give historical context* stay upstream. Alternatives considered: repointing everything mechanical, or keeping upstream authoritative — rejected respectively (would break useful history links) and (contradicts the fork's own release/update feed specified in `release-automation`).

3. **Site header "GitHub" link → fork repo.** Consistent with `releasesUrl`, which the previous fix already pointed at the fork; the README credits upstream in Acknowledgments, so attribution doesn't depend on the header button. Alternative: keep upstream on the button — rejected as the button is the site's primary "where is this project" affordance.

4. **FAQ states the fork home, credits upstream.** Wording will name the fork's Pages site and repository as the current home of this distribution and note upstream as the original project, preserving the anti-mirror warning intent. Alternative: delete the anti-mirror paragraph — rejected, it still protects users from third-party mirrors.

5. **`LargeDemo.csv` raw link → fork.** The file exists in the fork at `docs/.vitepress/LargeDemo.csv` on `master`, so the raw URL in `ys-kalyakin/Exiled-Exchange-2` serves identical content and stays correct across future local edits.

6. **Encode verified current state as ADDED `docs-site` requirements.** The deployment/version/download-link requirements describe behavior that already holds and must keep holding; the reference requirements describe what this change completes. Alternative — `skip_specs: true` and no spec — rejected: the docs site is durable user-facing behavior that no existing capability owns.

## Risks / Trade-offs

- [Upstream merge friction in four shared files] → Each edit is a one-line or single-string diff in upstream's prettier/2-space style; `config.js` and `docs/` already carry the previous, similar fork-only string edits.
- [Docs redeploy won't auto-trigger when only `main/package.json` changes] → Accepted and reflected in the spec ("version at build time"); bump runs normally include a docs touch when needed, and `workflow_dispatch` exists for forced refreshes.
- [Deployed site can lag README by one run] → Mitigation by dispatching the Docs run in the verification task instead of waiting for a push.

## Migration Plan

Single documentation-URL sync; no data, build, or dependency changes. Rollback is `git revert` of the change commit and re-dispatching the Docs workflow; the new spec is unarchived-by-default and removed with the change.

## Open Questions

None at design level. Exact FAQ wording is content-level and settled at implementation time; everything affecting behavior, scope, or tasks is decided above.
