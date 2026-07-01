# Phase 6C Sample Switcher Task

## Checklist

- [x] Load task attachment and classify task.
- [x] Create isolated worktree.
- [x] Create Autopilot context and active docs.
- [x] Complete ralplan planner review.
- [x] Complete architect review.
- [x] Complete critic review after BLOCK repair.
- [x] Record OMX tracker compatibility gap for Codex App subagent evidence.
- [x] Implement shared sample import workflow.
- [x] Implement public sample list resolver.
- [x] Implement Guide sample switcher UI.
- [x] Implement dirty-state confirmation.
- [x] Implement URL update after sample switching.
- [x] Add focused Node and E2E tests.
- [x] Update docs.
- [x] Regenerate dist.
- [x] Run validation.
- [x] Run code-review and QA gates.
- [ ] Commit, push, and prepare integration package.

## Delivery Package Draft

1. Extracted the sample import transaction into `js/core/sample_project_import_workflow.js` and reused it from startup deeplink and Guide switching.
2. Added public sample-list resolution in `js/core/sample_project_registry.js`, preserving checked-in manifest validation while filtering developer-preview entries from display.
3. Added the Guide sample switcher UI, dirty confirmation, success-only URL sync, i18n copy, dialog stacking fix, and pending-state switcher lock.
4. Extended Node contracts, sample Guide E2E, Pages release smoke, import graph, README files, release notes, and generated Pages dist.

Core files: `js/core/sample_project_import_workflow.js`, `js/core/sample_project_registry.js`, `js/bootstrap/startup_sample_project_deeplink.js`, `js/ui/toolbar.js`, `js/ui/toolbar/sample_project_banner_controller.js`, `js/ui/ui_surface_url_state.js`, `js/ui/ui_contract.js`, `index.html`, `css/style.css`, `js/core/i18n_catalog.js`, `data/locales.json`.

Test files: `tests/sample_project_contracts.test.mjs`, `tests/e2e/sample_guide_deeplink.spec.js`, `tests/e2e/release/pages_public_release_gate.spec.js`, `tests/e2e/test-import-graph.json`.

Docs and generated files: `README.md`, `README.zh-CN.md`, `docs/releases/v0.1-public-demo-draft.md`, `lessons learned.md`, `dist/app/**`, `dist/pages-dist-manifest.json`.

Diff summary: current unstaged diff is about 1,379 insertions and 337 deletions across 28 tracked files, plus new source/dist workflow files and this active task folder. The largest behavior reduction is deleting duplicated startup import code and routing startup plus switching through the shared workflow.

Commit status: functional Lore commit exists on `codex/phase6c-sample-switcher`; push remains.

Base divergence: this branch is one Phase 6C commit ahead of `origin/main@16abfd5f`; parent `main` remains untouched.

Potential conflicts: red with any simultaneous changes to `js/ui/toolbar.js`, `js/ui/toolbar/sample_project_banner_controller.js`, `index.html`, `css/style.css`, `js/core/sample_project_registry.js`, `tests/sample_project_contracts.test.mjs`, Pages release smoke, or generated `dist/app/**`; yellow with docs/release copy and URL-state helper changes.

Validation passed so far: changed-file `node --check`; JSON parse for `data/locales.json`; `npm run test:node:sample-project-contracts` `15/15`; `py -3 tools/i18n_audit.py` with `ui_missing=0` and `ui_english_fallback=0`; `npm run test:e2e:sample-guide` `2/2`; `npm run verify:pages-dist` with size `927.07 MiB`, startup shell `41/41`, landing showcase `18/18`, sample contracts `15/15`; local public mirror release gates at `http://127.0.0.1:8810/dist/` and post-review `http://127.0.0.1:8811/dist/`, both `1/1`; `npm run verify:architecture-boundaries`; `npm run verify:test-import-graph` after regenerating 51 specs; post-style `node --check tests/e2e/sample_guide_deeplink.spec.js`.

Code-review result: final code-review requested one P2 fix. `pending` is now part of the Guide switcher in-flight states, and the Node contract verifies all choices are disabled while startup import is queued. Post-fix `npm run test:node:sample-project-contracts`, `npm run verify:pages-dist`, and local Pages release gate passed.

Final staged gates passed: staged `npm run verify:dist-drift`, `git diff --check`, and `git diff --cached --check`.

Recommended next step: push `codex/phase6c-sample-switcher`; integrate into `main` only through an integration pass because the parent checkout has unrelated WIP.
