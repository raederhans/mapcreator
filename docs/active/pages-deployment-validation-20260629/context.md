# Phase 2B Pages Deployment Validation Context

## 2026-06-29 Intake

- User requested `$autopilot` for Phase 2B Pages deployment validation and public release gate.
- Task is complex/integration because it touches current `main`, Pages dist generation, GitHub workflow evidence, public URL smoke, docs, and final push.
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is dirty and behind `origin/main`; work is isolated in `C:\Users\raede\.codex\worktrees\scenario-forge-phase2b-pages-release-gate`.
- Branch: `codex/phase2b-pages-release-gate`.
- Base and current `HEAD`: `origin/main@456aea2f4e94267f347f72dde634aa88e1d344ad`.
- `.github/workflows/deploy.yml` supports both push to `main` and `workflow_dispatch`; jobs are `verify`, `build`, and `deploy`.
- Signed-in manifest before source changes reported `total_bytes=972534038`, `size_gate.status=within_limit`, and `max_allowed_bytes=1073741824`.

## Constraints

- Do not redesign README, landing, or product narrative.
- Do not reintroduce local-only HGO runtime payload, Japan industrial local preview GeoJSON, or full `city_aliases.json` into Pages.
- Keep public scenario policy at five public baselines plus HGO developer/local preview.
- Main agent owns live build/test/browser/workflow processes.

## 2026-06-29 Local Verification

- Initial `npm run verify:pages-dist` passed on branch `codex/phase2b-pages-release-gate` at `456aea2f4e94267f347f72dde634aa88e1d344ad`.
- After fixing the export workbench preview path, `npm run verify:pages-dist` passed again and regenerated `dist/app/js/ui/toolbar.js` plus `dist/pages-dist-manifest.json`.
- `tools/build_pages_dist.py` reported total size `927.48 MiB`.
- `dist/pages-dist-manifest.json` now reports `total_bytes=972534076`, `max_allowed_bytes=1073741824`, and `size_gate.status=within_limit`.
- `verify:pages-dist` included `tests.test_pages_dist_startup_shell` with `40` minimal-dependency tests passing and `tests/landing_showcase_view_behavior.test.mjs` with `9` tests passing.
- `py -3 -m unittest tests.test_pages_dist_startup_shell_heavy -q` passed with `2` Shapely-backed landing builder tests after they were split out of the deploy-minimal startup shell module.
- `py -3 -c "<blocked shapely import hook>; import tests.test_pages_dist_startup_shell"` passed, confirming the deploy-minimal startup shell module imports without Shapely.
- `node --check tests/e2e/release/pages_public_release_gate.spec.js` passed.
- `node --check js\ui\toolbar.js` passed.
- `node --test tests\export_workbench_state_behavior.test.mjs` passed with `10` tests.
- `py -3 -m unittest tests.test_toolbar_split_boundary_contract -q` passed with `53` tests.
- `py -3 tools\check_min_ci_requirements.py` passed with `heavy-tests=13`.
- `npm run verify:test:e2e-layers` passed after moving the release-gate spec under `tests/e2e/release/`, outside the generic `tests/e2e/*.spec.js` layer manifest scope.
- `git diff --check` passed; it only reported Windows LF-to-CRLF warnings for modified text files.
- Local static `dist/` smoke passed against `http://127.0.0.1:8766/`: root landing, `/app/?view=guide`, TNO interactive state, HGO not exposed, and export workbench open. The run recorded existing D3 water-geometry warnings and one expected anonymous backend auth probe.

## 2026-06-29 Deployment Workflow Evidence

- Repository Pages settings from `gh api repos/raederhans/scenario-forge/pages`: `build_type=workflow`, `public=true`, `html_url=https://raederhans.github.io/scenario-forge/`, `source.branch=main`, `source.path=/`.
- Latest `main` deploy workflow run before this branch: `28386728569`, commit `456aea2f4e94267f347f72dde634aa88e1d344ad`, conclusion `failure`.
- Failure root cause: `tools/check_min_ci_requirements.py` reported missing heavy dependency grouping entries for `tests/test_pages_dist_startup_shell.py` and `tests/test_transport_country_source_contracts.py`.
- Fix in this worktree: split Shapely-backed landing builder coverage to `tests/test_pages_dist_startup_shell_heavy.py`, add that heavy module plus `tests/test_transport_country_source_contracts.py` to `tests/heavy_dependency_groups.json`, and keep `tests/test_pages_dist_startup_shell.py` minimal for deploy-minimal.
- Added repeatable public URL release-gate smoke at `tests/e2e/release/pages_public_release_gate.spec.js` with package script `npm run test:e2e:pages-public-release-gate`.
- Public URL smoke before this branch deploy reproduced the same export workbench preview error that local current dist also reproduced. Root cause: `js/ui/toolbar.js` called `resolveExportPassSequence(...)` without `RENDER_PASS_NAMES` on direct composite export paths. Fix: pass `RENDER_PASS_NAMES` in both direct calls and lock it with `tests.test_toolbar_split_boundary_contract`.
