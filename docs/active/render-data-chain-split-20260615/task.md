# Render Data Chain Split Task

## Status

in-progress

## Checklist

- [x] Create isolated worktree.
- [x] Create active docs.
- [x] Update worktree registry for this branch.
- [x] Finish Workstream B.
- [x] Finish Workstream A.
- [x] Run targeted verification.
- [x] Run cleanup/review/UltraQA.
- [ ] Produce delivery package.
- [ ] Integrate to main and push.
- [ ] Clean temporary worktree after integration.

## Verification Log

- `py -m unittest tests.test_global_transport_builder_contracts -q` -> 62 tests OK.
- `py -m py_compile map_builder/transport_family_registry.py tools/build_transport_country_real_packs.py` -> OK.
- `node --check` on changed source and dist JS -> OK.
- `py -m unittest tests.test_transport_workbench_manifest_runtime_contract -q` -> 20 tests OK.
- `npm run test:node:transport-workbench-preview-lifecycle-owner` -> 15 tests OK.
- `npm run test:node:transport-overview-line-contract` -> 25 tests OK.
- `node tools/select_verification_targets.mjs --check` -> OK, 136 routes.
- `py tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.json` -> OK.
- `py tools/build_pages_dist.py` -> OK.
- `py -m unittest tests.test_pages_dist_startup_shell -q` -> 36 tests OK.
- `npm run test:node:landing-showcase-view` -> 6 tests OK.
- `npm run verify:test-import-graph` -> OK, 48 specs.
- `git diff --check` -> OK.
- Direct Playwright selected specs: 2 passed, 2 current-state failures recorded in context.
- Static review -> no blocker; medium registry limit drift risk fixed.
- Post-review `py -m py_compile map_builder/transport_family_registry.py tools/build_transport_country_real_packs.py` -> OK.
- Post-review `py -m unittest tests.test_global_transport_builder_contracts -q` -> 62 tests OK.

## Delivery Package Draft

1. Changed scope: data-chain OSM GPKG golden/registry closeout plus point/industrial preview loader/DOM split.
2. Core files: `map_builder/transport_family_registry.py`, `tools/build_transport_country_real_packs.py`, point preview loader/DOM/controller files, industrial loader/controller files, and matching `dist/app` mirrors.
3. Tests/docs: global transport builder contracts, transport workbench manifest runtime contract, active plan/context/task, worktree registry, regenerated `dist/pages-dist-manifest.json`.
4. Commit state: committed on `codex/render-data-chain-split-20260615`.
5. Base divergence: branch started from `origin/main` `26ae7677`; final merge check still pending.
6. Conflict risk: direct overlap with historical integrated transport worktrees only; active tooling phase2 has no direct file overlap.
7. Verification: targeted Python, node, import graph, manifest, Pages dist equivalent commands, and whitespace gates passed; selected E2E direct run exposed two pre-existing current-state expectation failures.
8. Remaining risk: E2E layer manifest count drift and stale E2E expectations remain outside this split.
9. Recommended next step: run integration planning against current main, then merge/push when main is clean.
