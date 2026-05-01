# test-system-routing-overhaul context

- Started from user-approved plan in fresh context.
- Current repo has existing `tools/e2e_layering.mjs`, `tests/e2e/test-layer-manifest.json`, `tests/heavy_dependency_groups.json`, and package scripts for Node/Python/E2E/perf.
- `lessons learned.md` confirms long commands and live tests should stay serialized/background-owned.
- Implemented `tools/test_route_registry.mjs` as the central route metadata source using the planned fields: `id`, `commandRef`, `sourceRef`, `domain`, `ownerHint`, `layer`, `cost`, `resourceLocks`, `executionOwner`, `ciProfile`.
- Updated `tools/e2e_layering.mjs`: `generate` writes tracked `tests/e2e/test-lists`, while `run`, `run-domain`, and `run-owner` write transient lists under `.runtime/tests/e2e-lists`.
- Added selector artifact output via `tools/select_verification_targets.mjs` and wired PR-fast CI to run `--check` before uploading `.runtime/reports/generated/verification-selector-explain.*`.
- Review fixes applied: added missing pr-fast Python fast contract routes, strengthened route validation, changed list-file input to `--changed-files-list`, and removed duplicate direct perf test route matching.
- Verified `run-domain city-runtime -- --list` creates `.runtime/tests/e2e-lists/domain-city-runtime.txt` and lists 8 tests without executing browser tests.

## Review follow-up 2026-05-01
- Fixed positional path parsing so `node tools/select_verification_targets.mjs js/ui/sidebar.js --json` treats the path as a changed file.
- Fixed directory `sourceRef` matching so `scenario_builder/hoi4/compiler.py` selects `python tools/build_hoi4_scenario.py`.
- Fixed `js/ui/**` routing so shell/sidebar UI source changes select `ui-shell` E2E domains.
