# Phase 6B Sample Guide Export Task

## Objective
Make the Guide aware of loaded or failed sample project deeplinks and provide a compact guided path to export/save the sample.

## Scope
Allowed:
- Sample-aware content in the Guide popover.
- Pure helper resolving Guide context from `runtimeState.sampleProjectDeeplink`.
- Guide actions for open export and original JSON download.
- Error-state messaging for bad sample links.
- i18n strings, tests, release smoke assertions, docs, and dist sync.

Out of scope:
- Core sample import architecture changes.
- Arbitrary project URLs.
- HGO sample loading.
- Backend/cloud dependencies.
- Full in-app sample gallery or switcher.
- Scenario runtime data changes.

## Delivery Package Template
- What changed:
  - Added a sample-aware Guide card for successful and failed sample deeplinks.
  - Shared sample title, public error copy, and original JSON URL resolution with the existing Project sample banner helper.
  - Wired Guide actions to the existing export workbench and default quick-guide path.
  - Added focused Node and Playwright coverage plus release-gate assertions.
  - Regenerated Pages dist and test import graph entries.
- Core files:
  - `js/ui/toolbar/sample_project_banner_controller.js`
  - `js/ui/toolbar.js`
  - `index.html`
  - `css/style.css`
  - `js/core/i18n_catalog.js`
  - `data/locales.json`
- Test files:
  - `tests/sample_project_contracts.test.mjs`
  - `tests/e2e/sample_guide_deeplink.spec.js`
  - `tests/e2e/release/pages_public_release_gate.spec.js`
  - `tests/e2e/test-import-graph.json`
- Docs files:
  - `README.md`
  - `README.zh-CN.md`
  - `docs/releases/v0.1-public-demo-draft.md`
  - `docs/archive/phase6b-sample-guide-export-20260630/*`
  - `docs/active/_worktree_registry.md`
- Generated files:
  - `dist/app/index.html`
  - `dist/app/css/style.css`
  - `dist/app/js/core/i18n_catalog.js`
  - `dist/app/js/ui/toolbar.js`
  - `dist/app/js/ui/toolbar/sample_project_banner_controller.js`
  - `dist/pages-dist-manifest.json`
- Diff summary:
  - Guide quick path now renders a compact sample helper card when sample deeplink state is success or error. Success exposes export and original JSON download; error exposes a safe continue action. Release smoke now checks the Guide card before Project banner coverage.
- Commit status:
  - Functional Lore commit `81f2f30e`; registry/archive closeout commit follows.
- Base commit and main divergence:
  - Base `fc59d527`; Phase6B functional commit was rebased onto P43 `origin/main@473cd389`.
- Potential conflicts:
  - P43 `package.json` overlap was resolved by rebase.
  - Yellow with future Guide UI, sample helper/tests, release smoke, and Pages dist edits.
- Validation:
  - `node --check` for changed JS/spec files passed.
  - `npm run test:node:sample-project-contracts` passed, 11/11.
  - `py -3 tools/i18n_audit.py` passed with `ui_missing=0`, `ui_english_fallback=0`.
  - `npm run test:e2e:sample-guide` passed, 2/2.
  - `npm run verify:pages-dist` passed with generated size `927.04 MiB`.
  - `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8810/dist/ npm run test:e2e:pages-public-release-gate` passed, 1/1.
  - `npm run verify:architecture-boundaries` passed.
  - `npm run verify:test-import-graph` passed after regenerating `tests/e2e/test-import-graph.json`.
  - `git diff --check` passed with Windows LF-to-CRLF warnings only.
  - Final code-reviewer returned CLEAR.
- Remaining risks:
  - Remote deployed Pages smoke has not been run in this closeout; local generated `/dist/` release gate passed.
  - P43 will need a package/registry merge decision after this commit lands.
- Recommended next step:
  - Commit registry/archive closeout and push `main`.
