# Phase5B Sample Deep Link Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase5b-sample-deeplink`
- Branch: `codex/phase5b-sample-deeplink`
- Creation base: `main@6c0400c58c21f27e6f1c862c586506d0290b02b1`.
- Current remote baseline: `origin/main@4375923d`; Phase5B is rebased on this baseline and is one commit ahead.
- Parent checkout remains active on `main@4375923d` with untracked duplicate Phase5B docs and must be preserved.

## Findings

- Manual project import enters through `importProjectThroughFunnel()` and `FileManager.importProject()`.
- `FileManager.importProject()` owned parsing, migration, normalization, callback, dirty-state clearing, and toast reporting in one FileReader callback.
- `view=guide` already works through the URL support-surface state; Phase5B only needs to add sample import and preserve the existing view parameter.
- `landing/assets/sample-runs.json` already contains the public sample allowlist, developer preview exclusion list, and local `project_url` values.

## Implementation Notes

- `FileManager.normalizeImportedProjectData()` now owns the existing migration/normalization block.
- `FileManager.importProjectText()` parses JSON text and uses the shared normalized callback path.
- `importProjectTextThroughFunnel()` applies fetched sample text through the existing runtime import funnel.
- `js/core/sample_project_registry.js` validates sample id shape, manifest membership, public scenario allowlist, developer exclusions, and fixed local file names.
- `js/bootstrap/startup_sample_project_deeplink.js` schedules sample import as a post-ready task and records `state.sampleProjectDeeplink`.
- Landing exposes both "Open sample in editor" and "Download project JSON" actions.

## Pending

- Follow-up code-review and architect lanes passed after the refreshed docs/registry, P39 registry row, and boot-state scaffold fix.
- Amend functional commit `db95f40f` with final docs, push fast-forward to `origin/main`, archive task docs, and clean this worktree when safe.
- Parent checkout is now on `main@4375923d` with the same untracked duplicate `docs/active/phase5b-sample-deeplink-20260630/` path; preserve it.
- P39 reset-hardening is integrated on main at `33056a21`, with follow-up registry/lesson closeouts through `4375923d`; the P39 worktree is no longer active.

## Validation Results

- `node --check js/core/file_manager.js js/core/interaction_funnel.js js/core/sample_project_registry.js js/bootstrap/startup_sample_project_deeplink.js js/main.js`: passed.
- `npm run test:node:sample-project-contracts`: passed, 6/6.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`: passed, 37/37.
- `npm run verify:pages-dist`: passed; builder total size `927.00 MiB`, Python startup shell 41/41, landing showcase 18/18, sample contracts 6/6.
- `git diff --check`: passed.
- Local dist release smoke with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:4179/`: passed, `sampleProjectDeeplink.status=success`, `sampleId=tno-1962-atlantropa-briefing`, `scenarioId=tno_1962`.
- `py -3 -m unittest tests.test_state_split_boundary_contract -q`: passed, 14/14 after adding the central `sampleProjectDeeplink` boot-state scaffold.
- Post-rebase `npm run verify:pages-dist` regenerated P38 `dist/app/js/core/map_renderer.js`, `dist/app/js/core/map_renderer/set_map_data_transaction_owner.js`, and `dist/pages-dist-manifest.json`; these generated files are staged.
- Staged `npm run verify:dist-drift`: passed after staging the post-rebase generated dist sync.
- Post-rebase local dist release smoke with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:4179/`: passed, `sampleProjectDeeplink.status=success`, `sampleId=tno-1962-atlantropa-briefing`, `scenarioId=tno_1962`.
- Post-P39 `npm run verify:architecture-boundaries`: passed.
- Final post-P39 `npm run verify:pages-dist`: passed, startup shell 41/41, landing 18/18, sample contracts 6/6, total size `927.00 MiB`.
- Final post-P39 `npm run verify:dist-drift`: passed.
- Final post-P39 local dist release smoke with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:4179/`: passed, `sampleProjectDeeplink.status=success`, `sampleId=tno-1962-atlantropa-briefing`, `scenarioId=tno_1962`.

## Review Results

- Code-reviewer lane: first REQUEST CHANGES for stale docs/registry only, then follow-up REQUEST CHANGES for missing active P39 worktree in registry. Both metadata issues were fixed; final follow-up returned APPROVE.
- Architect lane: WATCH for dynamic `sampleProjectDeeplink` state visibility. Fixed by adding `createDefaultSampleProjectDeeplinkState()` to `js/core/state/boot_state.js`, wiring it into `createDefaultBootState()`, and extending the state split boundary test. Final follow-up returned CLEAR.
