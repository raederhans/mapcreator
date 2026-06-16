# Transport Render/Data Closeout Plan

Date: 2026-06-16
Owner: main Codex agent
Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-transport-render-data-closeout`
Branch: `refactor/transport-render-data-closeout`
Base commit: `f4063d31165c6f9ae179b690ebded394c10366ff`

## Goal

Close the remaining transport render/data plan on the existing refactor branch:

1. WS3: sync tracked Pages dist, then add local and CI drift guards.
2. WS2: replace hand-rolled smoke profile structural validation with `jsonschema` while preserving security and relationship checks.
3. WS1: keep golden fixture safety, collapse four OSM-GPKG pack builders into one data-driven driver, and add Python-JS geometry contract coverage.
4. Audit the resulting commit cluster, fix concrete gaps, archive task docs, push to `origin/main`, and clean the worktree.

## Plan Audit

- The branch contained the expected road and rail preview split commits.
- The parent checkout had unrelated i18n and lessons changes, so execution used a separate worktree.
- The workstream order remained sound: dist first, profile schema second, OSM-GPKG driver last.
- Real Geofabrik cache validation was unavailable in this environment; golden fixture and contract tests are the recorded substitute.

## Acceptance Criteria

- `npm run verify:dist-drift` passes.
- A deliberate source edit proves the dist drift guard fails, then the edit is reverted.
- `py -3 -m unittest tests.test_playwright_app_ready_gate_contract -q` passes.
- `py -3 tools/browser_smoke_profile_contract.py ops/browser-mcp/inspection-profile.toml` prints `OK`.
- `py -3 -m unittest tests.test_global_transport_builder_contracts tests.test_transport_country_source_contracts -q` passes.
- `node tools/check_test_import_graph.mjs` passes.
- `npm run -s test:node:transport-workbench-preview-lifecycle-owner` passes.
- `git diff --check` passes.

## Live Process Ownership

The main Codex agent owns all long-running or stateful commands: dist builds, package scripts, Python tests, and Node tests. Subagents may do static inspection, implementation review, and test coverage suggestions against file snapshots.

## Task Checklist

- [x] Pre-flight: read skills, plan, lessons, registry, branch state, and automation memory.
- [x] Use isolated worktree and active task docs.
- [x] Dispatch static subagent audit/review lanes.
- [x] WS3: resync dist and add drift guard.
- [x] WS2: migrate validator to `jsonschema`.
- [x] WS1: driver refactor and geometry contract.
- [x] Final audit fixes for dist pathspec coverage, named runtime tests, and non-blank schema strings.
- [x] Final cleanup/review/QA and archived delivery package.
- [ ] Push to `origin/main`.
- [ ] Remove integration worktree after push confirmation.
