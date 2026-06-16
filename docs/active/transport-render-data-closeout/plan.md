# Transport Render/Data Closeout Plan

Date: 2026-06-16
Owner: main Codex agent
Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-transport-render-data-closeout`
Branch: `refactor/transport-render-data-closeout`
Base commit: `f4063d31165c6f9ae179b690ebded394c10366ff`
Starting HEAD: `db470af8f5ea01986fc3bd46c7f033764f613515`

## Goal

Close the remaining transport render/data plan on the existing refactor branch:

1. WS3: sync tracked Pages dist, then add local and CI drift guards.
2. WS2: replace hand-rolled smoke profile structural validation with `jsonschema` while preserving security and relationship checks.
3. WS1: add a golden fixture safety net, then collapse four OSM-GPKG pack builders into one data-driven driver and add Python-JS geometry contract coverage.

## Plan Audit

- The branch exists and contains the expected road and rail preview split commits.
- The main checkout has unrelated i18n and lessons changes, so execution is isolated in a separate worktree.
- The supplied workstream order is sound: WS3 removes generated drift first, WS2 is fully testable, WS1 is largest and depends on a golden test before refactor.
- The plan's `Co-Authored-By` footer will be retained, and commit messages will also follow the repository Lore Commit Protocol.
- Real Geofabrik cache validation is unavailable in this environment unless source caches exist; WS1 will use golden fixture and contract tests, then document the remaining real-data check.

## Acceptance Criteria

- `npm run verify:dist-drift` passes after WS3.
- A deliberate source edit proves the dist drift guard fails, then the edit is reverted.
- `python -m unittest tests.test_playwright_app_ready_gate_contract -q` passes after WS2.
- `python tools/browser_smoke_profile_contract.py ops/browser-mcp/inspection-profile.toml` prints `OK`.
- `python -m unittest tests.test_osm_gpkg_family_driver_golden tests.test_global_transport_builder_contracts -q` passes after WS1.
- `node tools/check_test_import_graph.mjs` passes before closeout.
- Final changed-file review, ai-slop-cleaner pass, independent code review, and QA evidence are recorded.

## Live Process Ownership

The main Codex agent owns all long-running or stateful commands: dist builds, package installs, Python tests, Node tests, and final verification. Subagents may do static inspection, implementation review, and test coverage suggestions against file snapshots; they must not run or monitor the same live commands.

## Task Checklist

- [x] Pre-flight: read skills, plan, lessons, registry, and branch state.
- [x] Create isolated worktree and active task docs.
- [ ] Dispatch static subagent review lanes for WS1, WS2, and WS3.
- [ ] WS3: resync dist and add drift guard.
- [ ] WS2: add dependency and migrate validator.
- [ ] WS1: golden fixture, driver refactor, geometry contract.
- [ ] Final cleanup/review/QA, delivery package, commit/push/cleanup.
