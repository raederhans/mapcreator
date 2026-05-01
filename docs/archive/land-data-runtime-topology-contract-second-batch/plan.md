# land-data runtime topology contract 第二批 plan

## Acceptance checklist
- [x] Runtime topology payload validation runs before scenario state commit.
- [x] Startup hydration marks unrenderable topology as fatal with centralized reason.
- [x] Blank scenario keeps its explicit empty topology path valid.
- [x] Source sha metadata survives startup/full bundle assembly and drives runtime identity.
- [x] Startup persistent cache keys include runtime source sha identity.
- [x] Strict checker validates checked-in full/bootstrap/detail chunk package integrity.
- [x] Pages dist keeps bootstrap/detail chunk runtime paths and removes local-only full/audit URLs.
- [x] Scenario manager facade no longer owns resource loading internals.
- [x] Targeted Node tests pass.
- [x] Targeted Python/contract tests pass.
- [x] Pages dist verification passes.

## Progress
- [x] Created execution docs and context snapshot.
- [x] Current code grounding.
- [x] Implementation.
- [x] Static review.
- [x] Review blocker fixes.
- [x] Verification.
- [x] Archive active docs after successful self-check.

## Verification evidence
- `node --check` target JS files: passed.
- `python -m py_compile` target Python files: passed.
- `npm run test:node:startup-hydration-behavior`: 9 passed.
- `npm run test:node:scenario-lifecycle-runtime-behavior`: 4 passed.
- `npm run test:node:scenario-runtime-state-behavior`: 4 passed.
- `npm run test:node:scenario-chunk-contracts`: 16 passed.
- `python -m unittest tests.test_scenario_contracts tests.test_startup_bootstrap_assets tests.test_pages_dist_startup_shell tests.test_data_manifest_contract tests.test_scenario_manager_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_startup_shell -q`: 67 passed, 7 skipped.
- `python tools/check_scenario_contracts.py --strict`: all checked-in scenarios OK.
- `npm run verify:pages-dist`: 12 tests passed, dist size 841.95 MiB.
- `git diff --check`: passed.

## Review blocker resolution
- Added blank scenario startup hydration exemption and test.
- Added source sha components to startup scenario cache keys and cache source match guard.
- Passed `detail_chunk_manifest_path` through HOI4/TNO startup bundle builders.
- Tightened strict checker to reject non-blank startup shells without political geometries.
- Tightened Pages URL probe for empty manifest_url and path containment.
