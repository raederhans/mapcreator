# Phase6A Public Sample Experience Context

## Baseline

- Checkout: `C:\Users\raede\Desktop\dev\mapcreator`
- Branch: `main`
- Start HEAD: `28a743c5`
- Remote status at intake: `main...origin/main`, clean.
- Worktrees at intake: only `C:\Users\raede\Desktop\dev\mapcreator`.
- Phase5B sample deep links are integrated and archived under `docs/archive/phase5b-sample-deeplink-20260630/`.

## Intake Findings

- Phase5B already added safe sample registry, startup sample import, FileManager shared text/file import normalization, landing sample deep links, and release smoke state checks.
- The Phase6A seed provides enough objective, allowed scope, disallowed scope, tasks, and acceptance criteria to complete the deep-interview gate without another user question.
- Lessons learned relevant to this task:
  - Project import/export UI state should bind to the async transaction completion point.
  - New visible UI copy should use the existing i18n/catalog path when needed.
  - Pages source/dist changes should be regenerated and drift-checked from the final tree.

## Current Progress

- [x] Loaded `$autopilot` and `$code-review` skill instructions.
- [x] Read the Phase6A task seed.
- [x] Checked worktrees and git status.
- [x] Read project AGENTS rules and relevant lessons learned notes.
- [x] Created this active task documentation set.
- [x] Completed static code mapping and test strategy intake through native subagents.
- [x] Wrote and reviewed ralplan consensus artifacts.
- [x] Implemented source changes.
- [x] Regenerated dist and validated core/release behavior.
- [x] Run final code-review and architecture review gates.
- [x] Run final QA gate.

## Static Intake Results

- `code-mapper` found the sample deep-link flow in `js/main.js`, `js/core/sample_project_registry.js`, `js/bootstrap/startup_sample_project_deeplink.js`, `js/ui/ui_surface_url_state.js`, and `js/ui/toolbar/workspace_chrome_support_surface_controller.js`.
- Existing state flow is `pending -> loading -> importing -> success/error`, written through `state.sampleProjectDeeplink`.
- Project/Utilities sidebar areas are the lowest-risk visible surfaces. This task uses Project because the required next action is export/download.
- `qa-expert` recommended extending existing tests: `tests/sample_project_contracts.test.mjs`, `tests/landing_showcase_view_behavior.test.mjs`, and `tests/e2e/release/pages_public_release_gate.spec.js`.
- Long validation remains main-owned: `verify:pages-dist`, Playwright release gate, and any dev server/browser process.

## Ralplan Consensus Draft

- Keep the import architecture unchanged; add only a UI observer hook after `sampleProjectDeeplink` state writes.
- Keep user-visible sample feedback in the app shell, not inside the registry or FileManager.
- Test the pure banner view helper in the Node sample contracts, the landing copy/link contract in landing tests, and the live success banner in the release gate.
- Treat `index.html`, `css/style.css`, `js/ui/toolbar.js`, `js/bootstrap/startup_sample_project_deeplink.js`, landing source, docs, tests, and `dist/**` as the current expected diff set.

## Live Process Ownership

Main Codex agent owns all live commands for this task. Current live process: none.

## Subagents

- `code-mapper` agent `019f1a38-f74e-73e3-b698-dec030d3f8e4`: static code path mapping only.
- `qa-expert` agent `019f1a39-3d8f-72b1-9871-7478c04e1ef5`: static test strategy only.
- `architect` agent `019f1a3f-32d2-7072-baf4-101a8a4c1a87`: ralplan architecture review; concerns were addressed by hook-bus test coverage and release-gate banner assertions.
- `critic` agent `019f1a3f-6d04-7d50-a767-e357855341b2`: ralplan critique; concerns were addressed by notification hook placement, `appProjectUrl` download preference, bad-link UI tests, and Project tab visibility checks.
- `code-reviewer` agent `019f1a59-cba1-74e3-898f-224a5e06b99c`: final static code review found no blocking issues; its remaining click-path concern is covered by the release gate and controller behavior test.
- `architect` agent `019f1a5a-0b4c-7ad0-9b93-a4842b425737`: final static architecture review returned WATCH for English toast copy on bad sample links; fixed by translating sample toast title/body through the existing `ui.t` path and locking it in `tests/sample_project_contracts.test.mjs`.
- `verifier` agent `019f1a6d-d1f6-7260-af54-2f178b0c3740`: final QA returned WATCH/ready-for-integration; required follow-ups are explicit staging of untracked files and post-commit `verify:dist-drift`.

## Implementation Notes

- Added `js/ui/toolbar/sample_project_banner_controller.js` as a small toolbar-owned controller with a pure `resolveSampleProjectBannerView()` helper.
- `startup_sample_project_deeplink.js` remains the state owner and now emits `refreshSampleProjectBannerFn` after each `sampleProjectDeeplink` write.
- The banner is mounted in the Project sidebar, opens the existing export workbench hook, and links to the checked-in original JSON through `appProjectUrl` first.
- Landing sample CTAs now say `Open editable sample`, `Download JSON`, and `View recipe`; the public sample list keeps the same source-backed JSON links.
- `data/locales.json`, `data/manifest.json`, and `dist/**` were regenerated or mirrored for the new UI copy and Pages build.
- Pages dist regeneration also synchronized the already-committed P41 renderer request boundary owner source into `dist/app/js/core/map_renderer.js` and `dist/app/js/core/map_renderer/render_request_boundary_owner.js`.

## Validation Evidence

- `node --check js/ui/toolbar/sample_project_banner_controller.js` passed.
- `node --check js/bootstrap/startup_sample_project_deeplink.js` passed.
- `node --check js/ui/toolbar.js` passed.
- `node --check tests/sample_project_contracts.test.mjs` passed.
- `npm run test:node:sample-project-contracts` passed 9/9. The printed invalid JSON stack is from the existing failure-path assertion.
- `npm run python -- -m unittest tests.test_runtime_hooks_boundary_contract -q` passed 6 tests.
- `npm run test:node:annotation-productization` passed 63/63.
- `npm run python -- tools/i18n_audit.py` passed with `ui_missing=0` and `ui_english_fallback=0`.
- `npm run python -- -m unittest tests.test_data_manifest_contract -q` passed 14 tests.
- `npm run verify:pages-dist` passed: startup shell 41/41, landing 18/18, sample contracts 9/9.
- Local Pages release gate passed at `http://127.0.0.1:4173/`: `sampleProjectDeeplink.status=success`, sample `tno-1962-atlantropa-briefing`, scenario `tno_1962`, Project banner visible, export workbench visible.
- `git diff --check` passed with Windows LF-to-CRLF warnings only.
- Final QA verifier returned WATCH/ready-for-integration and highlighted only staging/post-commit dist-drift follow-ups.
- `npm run verify:dist-drift` before commit reported the expected Phase6A `dist/**` diff.
- `npm run verify:dist-drift` after functional commit `690b1997` passed and confirmed generated Pages dist was aligned with `HEAD`.

## P41 Dist Boundary

- P41 source is integrated and pushed in `main`/`origin/main` at `419c6ba0`; no P41 source or test WIP remains dirty.
- The current Phase6A Pages regeneration produced P41 dist sync files because source `js/core/map_renderer.js` and `js/core/map_renderer/render_request_boundary_owner.js` are already in `HEAD` while prior dist was stale.
