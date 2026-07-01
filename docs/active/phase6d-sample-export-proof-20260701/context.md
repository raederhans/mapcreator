# Phase 6D Context

## 2026-07-01 Intake

- Loaded skills: `ralph`, `ultraqa`, and `frontend-components-standards`.
- Attachment objective: implement Phase 6D Sample Export Proof Polish.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-phase6d-sample-export-proof`.
- Branch: `codex/phase6d-sample-export-proof`.
- Base: rebased to `origin/main@c20cc67f` before editing.
- Parent checkout: dirty and behind `origin/main`; left untouched.
- Current live process owner: main Codex thread. Subagents may inspect files and review static outputs; they may not start, poll, or interpret live browser/dev-server/test processes.

## Initial Risk Notes

- Shared hot files may include `index.html`, `css/style.css`, `js/ui/toolbar.js`, and generated `dist/app/**`; edits to these must be serial and carefully reviewed.
- Existing renderer-hit-canvas P47 worktree is present and dirty, with overlap risk mainly around `package.json`, `tools/check_architecture_boundaries.mjs`, and test metadata if this task changes shared verification routing.
- The parent main checkout has unrelated docs/archive/landing/lessons WIP.

## UltraQA Scenario Matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BASE-NODE | Normal maintainer | Sample recommendation contract validation | `npm run test:node:sample-project-contracts` | Public samples have valid recommendation metadata; HGO absent; TNO helper view resolves | Pending | Pending | Built-in test only |
| BASE-E2E | Normal user | Open TNO sample Guide, open export | focused sample Guide E2E | Guide and export workbench show recommendation context | Pending | Pending | Playwright artifacts under `.runtime/` |
| REL-SMOKE | Release verifier | Public release gate checks sample proof text without downloading | release gate against generated `dist/` | Recommendation and context visible, no download action | Pending | Pending | Playwright artifacts under `.runtime/` |
| ADV-MISSING | Malformed input | Sample manifest entry missing recommendation | Node contract fixture/path | Validation rejects or helper returns null as appropriate | Pending | Pending | No generated committed fixture unless useful |
| ADV-INVALID | Malformed input | Invalid target/format/scale/layer values | Node contract | Allowed values enforced | Pending | Pending | Built-in test only |
| ADV-NOSAMPLE | Normal user | Export Workbench with no active sample | Node/static or E2E observation | No sample context required; normal export stays available | Pending | Pending | Existing UI path |
| ADV-HGO | Safety guard | HGO/developer preview attempted through public manifest | Node contract | HGO remains absent | Pending | Pending | Built-in test only |
| ADV-MISLEAD | Misleading success output | Verification command exit status and output checked together | validation command review | Exit code and output both confirm pass | Pending | Pending | Command logs |

## Progress Log

- Created Ralph context snapshot at `.omx/context/phase6d-sample-export-proof-20260701T194408Z.md`.
- Created task docs under `docs/active/phase6d-sample-export-proof-20260701/`.
- Added public `recommended_export` metadata to the five checked-in public sample projects in `landing/assets/sample-runs.json`.
- Added `js/core/sample_export_recommendation.js` as the pure validation/resolver helper.
- Threaded `recommendedExport` through sample registry and import workflow.
- Added Guide card recommendation text and Export Workbench sample context readout.
- Review finding fixed: failed sample switches now preserve `previousRecommendedExport`, and the resolver binds recommendation source to the same committed sample id as `previousSampleId`.
- Validation passed:
  - `npm run test:node:sample-project-contracts`
  - `npm run test:e2e:sample-guide`
  - `npm run verify:test:e2e-layers`
  - `npm run verify:test-import-graph`
  - `npm run verify:pages-dist` with generated dist total size `927.08 MiB`
  - Local dist release gate with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8917/ npm run test:e2e:pages-public-release-gate`
  - `git diff --check`
  - `py -3 tools/i18n_audit.py`
  - `npm run verify:dist-drift` after staging generated dist files
