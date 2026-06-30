# Phase6A Public Sample Experience Task

## Status

In progress. Implementation, review-fix, QA, and main-owned validation are complete. Commit, push, post-commit dist drift, and archive remain.

## Acceptance Criteria

- Opening `/app/?sample=tno-1962-atlantropa-briefing&view=guide` visibly confirms that a sample project loaded.
- The app tells the user to edit, export/save their own copy, or download the original JSON.
- Unknown or bad sample links fail visibly and non-fatally.
- Landing sample CTAs are clearer and retain download links plus source-backed metadata.
- Release smoke still passes and checks sample manifest sanity or loaded-banner visibility.
- Pages dist remains within release size targets.
- Core runtime/data policy remains unchanged.

## Delivery Package

1. Changed what: added an app Project-sidebar sample banner for loaded/error states; added export/open-original actions; clarified landing sample CTAs; extended release/sample/landing/runtime-hook tests; regenerated locales/manifest and Pages dist.
2. Files:
   - Core: `js/ui/toolbar/sample_project_banner_controller.js`, `js/bootstrap/startup_sample_project_deeplink.js`, `js/core/state/config.js`, `js/ui/i18n.js`, `js/ui/toolbar.js`, `index.html`, `css/style.css`, `js/core/i18n_catalog.js`, `data/locales.json`, `data/manifest.json`.
   - Landing/docs: `landing/index.html`, `landing/app.js`, `landing/styles.css`, `README.md`, `README.zh-CN.md`, `docs/releases/v0.1-public-demo-draft.md`.
   - Tests: `tests/sample_project_contracts.test.mjs`, `tests/landing_showcase_view_behavior.test.mjs`, `tests/e2e/release/pages_public_release_gate.spec.js`, `tests/test_runtime_hooks_boundary_contract.py`.
   - Generated: `dist/app.js`, `dist/index.html`, `dist/styles.css`, `dist/app/index.html`, `dist/app/css/style.css`, `dist/app/js/**`, `dist/pages-dist-manifest.json`.
   - Task docs: this `docs/active/phase6a-public-sample-experience-20260630/` set and `docs/active/_worktree_registry.md`.
3. Diff summary: local `sampleProjectDeeplink` state writes now notify a narrow banner hook; the toolbar owns a compact sample banner view/controller; landing and release copy now emphasize editable samples plus original JSON; tests lock happy path, bad-link state, hook placement, landing copy, and release smoke visibility.
4. Commit status: not committed yet; final QA and commit/push are still pending.
5. Base divergence: Phase6A started from `main@28a743c5` aligned with `origin/main@28a743c5`; current `main` and `origin/main` are aligned at `419c6ba0` after P41 integration closeout.
6. Potential conflicts: green against current P41 source because P41 is already integrated; yellow for generated Pages dist because Phase6A regeneration also synced the already-committed P41 renderer source into `dist/app/**`.
7. Validation passed: `node --check` for changed JS/test files, sample contracts 9/9, runtime hook boundary 6/6, annotation-productization 63/63, i18n audit `ui_missing=0`, data manifest 14/14, `verify:pages-dist` startup 41/41 + landing 18/18 + sample 9/9, local Pages release gate 1/1.
8. Remaining risk: `verify:dist-drift` is expected to fail before commit because it compares generated `dist/**` against `HEAD`; rerun after the Phase6A commit. Final QA returned WATCH/ready-for-integration with only staging and post-commit dist-drift follow-ups.
9. Recommended next step: run `git diff --check`, run final QA, stage Phase6A plus generated dist sync files, commit with Lore protocol, rerun `verify:dist-drift` from the committed tree, push, then archive this task folder.
10. Integration status: functionally ready; integration path is direct commit on main.
