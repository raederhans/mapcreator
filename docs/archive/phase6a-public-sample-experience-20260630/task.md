# Phase6A Public Sample Experience Task

## Status

Archived. Implementation, review-fix, QA, functional commit, post-commit dist drift, and archive move are complete; push follows this closeout.

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
   - Task docs: this `docs/archive/phase6a-public-sample-experience-20260630/` set and `docs/active/_worktree_registry.md`.
3. Diff summary: local `sampleProjectDeeplink` state writes now notify a narrow banner hook; the toolbar owns a compact sample banner view/controller; landing and release copy now emphasize editable samples plus original JSON; tests lock happy path, bad-link state, hook placement, landing copy, and release smoke visibility.
4. Commit status: functional Lore commit `690b1997` created; this archive closeout commit follows.
5. Base divergence: Phase6A started from `main@28a743c5` aligned with `origin/main@28a743c5`; current `main` and `origin/main` are aligned at `419c6ba0` after P41 integration closeout.
6. Potential conflicts: green against current P41 source because P41 is already integrated; yellow for generated Pages dist because Phase6A regeneration also synced the already-committed P41 renderer source into `dist/app/**`.
7. Validation passed: `node --check` for changed JS/test files, sample contracts 9/9, runtime hook boundary 6/6, annotation-productization 63/63, i18n audit `ui_missing=0`, data manifest 14/14, `verify:pages-dist` startup 41/41 + landing 18/18 + sample 9/9, local Pages release gate 1/1.
8. Remaining risk: no known product-code risk after final QA and post-functional dist drift; deployed GitHub Pages URL remains outside local validation.
9. Recommended next step: commit this archive closeout, rerun final-head dist drift, then push main.
10. Integration status: integrated locally on main and archived; push remains.
