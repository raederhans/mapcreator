# Phase5B Sample Deep Link Task

## Status

Ready for fast-forward integration after post-P39 validation.

## Completed

- Created sample registry and startup sample deep-link import path.
- Refactored FileManager import internals so manual file import and sample text import share normalization.
- Added landing open-in-editor links for all public samples.
- Updated public sample manifest `demo_path` values.
- Added docs for public sample deep-link format.
- Extended tests for sample resolver safety, shared import normalization, landing contracts, Pages static contracts, and release smoke state.

## Validation Log

- `node --check js/core/file_manager.js js/core/interaction_funnel.js js/core/sample_project_registry.js js/bootstrap/startup_sample_project_deeplink.js js/main.js`: passed.
- `npm run test:node:sample-project-contracts`: passed, 6/6.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`: passed, 37/37.
- `npm run verify:pages-dist`: passed; builder total size `927.00 MiB`, Python startup shell 41/41, landing showcase 18/18, sample contracts 6/6.
- `git diff --check`: passed.
- Local dist release smoke with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:4179/`: passed, sample auto-import success for `tno-1962-atlantropa-briefing` into `tno_1962`.
- `py -3 -m unittest tests.test_state_split_boundary_contract -q`: passed, 14/14 after adding the central `sampleProjectDeeplink` boot-state scaffold.
- `npm run verify:architecture-boundaries`: passed after rebasing over P39.
- `npm run verify:dist-drift`: passed after staging the post-rebase generated `dist/**` sync.
- Final post-P39 local dist release smoke with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:4179/`: passed, `sampleProjectDeeplink.status=success`, sample `tno-1962-atlantropa-briefing`, scenario `tno_1962`.

## Delivery Package Draft

1. What changed:
   - Shared FileManager text/file project import normalization.
   - Public sample id resolver with manifest allowlist and safe local project asset fetch.
   - Startup post-ready auto-import for `/app/?sample=<id>&view=guide`.
   - Central boot-state scaffold entry for `sampleProjectDeeplink`.
   - Landing open/download links and sample manifest demo paths.
   - Tests/docs for safe sample deep links.
2. Core files:
   - `js/core/file_manager.js`
   - `js/core/interaction_funnel.js`
   - `js/core/sample_project_registry.js`
   - `js/core/state/boot_state.js`
   - `js/bootstrap/startup_sample_project_deeplink.js`
   - `js/main.js`
3. Test files:
   - `tests/sample_project_contracts.test.mjs`
   - `tests/file_manager_project_roundtrip_behavior.test.mjs`
   - `tests/landing_showcase_view_behavior.test.mjs`
   - `tests/test_pages_dist_startup_shell.py`
   - `tests/e2e/release/pages_public_release_gate.spec.js`
   - `tests/test_state_split_boundary_contract.py`
4. Docs/source landing:
   - `landing/index.html`
   - `landing/app.js`
   - `landing/styles.css`
   - `landing/assets/sample-runs.json`
   - `README.md`
   - `README.zh-CN.md`
   - `docs/releases/v0.1-public-demo-draft.md`
   - `docs/active/_worktree_registry.md`
5. Current diff summary:
   - Source/docs/tests excluding `dist/**`: 19 files plus new modules/docs, with FileManager normalization extraction, sample registry/startup import, landing links, tests, and boot-state scaffold updates.
   - Full diff includes regenerated Pages dist mirrors, post-rebase P38 dist owner mirror sync, and LF-normalized sample project assets under `landing/assets/sample-projects/**` and `dist/assets/sample-projects/**`.
6. Commit status:
   - Functional commit `db95f40f` exists after rebase over `origin/main@4375923d`; final docs/status sync is staged for amend.
7. Base/main divergence:
   - Base is `6c0400c5`; current `origin/main` is `4375923d`; after rebase, `git rev-list --left-right --count HEAD...origin/main` reports `1 0`.
8. Potential conflicts:
   - Yellow with parent checkout because `C:\Users\raede\Desktop\dev\mapcreator` is on `main@4375923d` with untracked `docs/active/phase5b-sample-deeplink-20260630/`.
   - Green direct production-code overlap with integrated P39 because P39 was docs/tests/tooling only; yellow only for parent checkout's untracked duplicate active docs path.
   - Production overlap is green by file path against the parent checkout.
9. Verification:
   - Passed targeted syntax, sample contracts, FileManager roundtrip, state split boundary, architecture boundaries, Pages dist verification, dist drift check, diff check, and local release smoke.
10. Recommended next step:
   - Amend the feature commit with final docs sync, push fast-forward to `origin/main`, then archive docs and remove this worktree after remote confirmation.
