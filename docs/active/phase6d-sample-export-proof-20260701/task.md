# Phase 6D Task Ledger

## Checklist

- [x] Context and registry prepared.
- [x] Code paths inspected.
- [x] Recommendation metadata added.
- [x] Resolver/helper implemented.
- [x] Guide sample card updated.
- [x] Export Workbench context updated.
- [x] Tests updated.
- [x] Docs updated.
- [x] Pages dist regenerated.
- [x] Required validation run.
- [x] Review/bug/first-principles pass completed.
- [x] Delivery package written.

## Delivery Package Draft

1. What changed: public samples now carry validated export recommendation metadata; Guide shows the recommendation label; Export Workbench shows loaded sample context and format/scale/target summary; failed sample switches keep the previous sample's recommendation bound to the previous sample id.
2. File groups: core files are `js/core/sample_export_recommendation.js`, `js/core/sample_project_registry.js`, `js/core/sample_project_import_workflow.js`, `js/ui/toolbar/sample_project_banner_controller.js`, `js/ui/toolbar/export_workbench_controller.js`, `js/ui/toolbar.js`, `index.html`, `css/style.css`, `landing/assets/sample-runs.json`, and i18n files. Test files are `tests/sample_project_contracts.test.mjs`, `tests/e2e/sample_guide_deeplink.spec.js`, and `tests/e2e/release/pages_public_release_gate.spec.js`. Docs are `README.md`, `README.zh-CN.md`, `docs/releases/v0.1-public-demo-draft.md`, this task folder, and `_worktree_registry.md`. Generated files are `dist/app/**`, `dist/assets/sample-runs.json`, and `dist/pages-dist-manifest.json`.
3. Diff summary: about 596 insertions and 38 deletions across 27 tracked files, plus new source/dist helper files and task docs.
4. Commit status: staged for final Lore commit.
5. Base divergence: branch starts from `origin/main@c20cc67f`; parent main is unrelated dirty WIP and remains untouched.
6. Conflict candidates: yellow risk with sample Guide/export UI and generated Pages dist; yellow with active P47 only through shared repo registry/docs, with no direct product file overlap observed.
7. Validation: passed `npm run test:node:sample-project-contracts`, `npm run test:e2e:sample-guide`, `npm run verify:test:e2e-layers`, `npm run verify:test-import-graph`, `npm run verify:pages-dist`, local dist release gate via `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8917/ npm run test:e2e:pages-public-release-gate`, `git diff --check`, `git diff --cached --check`, `py -3 tools/i18n_audit.py`, and staged `npm run verify:dist-drift`.
8. Unverified risks: none known inside Phase 6D scope; parent checkout remains unrelated dirty WIP.
9. Recommended next step: commit with Lore protocol, then integrate to main if `origin/main` is still `c20cc67f`.
10. Integration status: ready for commit and fast-forward integration.
