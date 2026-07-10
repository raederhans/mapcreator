# Scenario Forge P2 Renderer Frame Orchestration Task Ledger

Date: 2026-07-10

Current status: P2.0 docs-only truth reconciliation complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`; test-only repair is committed at `28bda618`, historical focused browser evidence is 2/5, and the production disclosure contract is now green through source/E2E/contract, deterministic, static review, canonical Pages generation, dist parity, post-build boundary, and adaptive evidence. Functional commit, clean-head `verify:dist-drift` / `verify:core`, browser baseline, main-thread baseline, perf baseline, and P2.1 entry remain pending.

## P2.0 docs-only truth reconciliation

- [x] Read current registry and P1 plan/context/task.
- [x] Read the approved P2 plan title, execution topology, fixed owner topology, and stop conditions.
- [x] Update current truth surfaces for parent, release residue, P1 cleanup, and P2 startup.
- [x] Create P2 plan/context/task with fixed owner path, invariants, log root, single live-process owner, stop rules, and staged checklist.
- [x] Run stale-closeout grep on current truth files only.
- [x] Run `git diff --check`.
- [x] Run selector with `--changed-file` for all seven docs files and confirm `unmatchedChangedFiles=[]`.
- [x] Stage only the seven docs files and inspect staged diff.
- [x] Create the docs-only Lore commit `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`.

## Pre-P2 repair checklist

- [x] Record initial main-thread collection failure from missing Pages release URL.
- [x] Record the incorrect retry using `PLAYWRIGHT_TEST_BASE_URL` with `/dist` for every test.
- [x] Record the correct separated probe using `MAPCREATOR_BASE_URL=http://127.0.0.1:8892` plus `SCENARIO_FORGE_PAGES_URL=http://127.0.0.1:8892/dist/` and no `PLAYWRIGHT_TEST_BASE_URL`, producing four downloads.
- [x] Identify remaining test drift: hidden styled-select native control plus stale schema `21` versus production/unit schema `22`.
- [x] Keep scope to one E2E and existing P2 docs, with parent WIP untouched.
- [x] Record historical expected-red owner path `/root/p2_baseline_test_fix`.
- [x] `node --check tests/e2e/project_save_load_roundtrip.spec.js` exit 0.
- [x] `git diff --check` exit 0.
- [x] `npm run verify:test:e2e-layers` exit 0 with 47 manifest specs.
- [x] `npm run verify:test-import-graph` exit 0 with 51 specs.
- [x] Adaptive dry-run artifact `.runtime/reports/generated/test-adaptive-selection.json`: `changedFiles=4`, `recommendedCommands=7`, `mainThreadSerialVerification=1`, `unmatchedChangedFiles=[]`.
- [x] Create the pre-P2 repair Lore commit.
- [x] Record expected-red focused browser evidence after `28bda618`: 2/5 with Project/Legend/Diagnostics disclosures closed by `renderPresetTree -> updateScenarioInspectorLayout` under an active scenario.
- [x] Remove the production five-line forced-close block for global Project/Legend/Diagnostics disclosures in `updateScenarioInspectorLayout`, while preserving the `scenarioDefaultsKey` gate, `collapseScenarioManagedSections()`, secondary styling, selected action visibility, scenario-managed collapse behavior, and URL-sync behavior.
- [x] Update `project_save_load_roundtrip.spec.js` to open `#projectLegendSection` through a visible real `#lblProjectLegend` summary click, await `state.renderPresetTreeFn`, reassert open state, and assert URL `section` contains `projectLegendSection` with `expect.poll`.
- [x] Focused Python disclosure coverage is green 1/1.
- [x] Full UI mainline keeps the new disclosure contract green and has two existing out-of-scope HTML substring errors: project sidebar order and `transportProjectSection`.
- [x] Deterministic evidence is green: Node syntax; state-write allowlist 115; architecture boundaries; selector schema 282; E2E layers 47; import graph 51; supervisor contracts and plan.
- [x] Independent static review result is `APPROVE`.
- [x] Canonical Pages generation: `verify:pages-dist` exited 0 with total 927.16 MiB; startup shell 44/44; landing showcase 18/18; sample project 17/17.
- [x] Dist parity is green: generated tracked files are exactly `dist/app/js/ui/sidebar.js` and `dist/pages-dist-manifest.json`; source/dist sidebar hashes both equal `6a67865bc5d199c20b7cb639c99ca12cabca1932`.
- [x] Post-build sidebar/support boundary suite is green 19/19.
- [x] Adaptive result is `changedFiles=8`, `recommendedCommands=61`, `mainThreadSerialVerification=53`, `unmatchedChangedFiles=0`.
- Operational note: the Conductor hook prevented writing the requested Pages log file; full output remains in the sole live-owner Codex transcript.
- [ ] Create the functional commit for the production disclosure race repair; this remains the gate before clean-head `verify:dist-drift` and `verify:core`.
- [ ] After the functional commit, run clean-head `verify:dist-drift` and clean-head `verify:core`.
- [ ] Record browser baseline.
- [ ] Record main-thread baseline.
- [ ] Record perf baseline.
- [ ] Reach green baseline before P2.1.

## Clean baseline

- [ ] Root assigns one live-process owner before any repaired browser/main-thread/perf baseline run.
- [ ] Run `verify:core:main-thread`, physical-layer regression, scenario resilience, and `perf:gate` under one live-process owner.
- [ ] Run later browser gates for focused project save/load, existing UI mainline contract, and clean-head baseline under the sole live owner.
- [ ] Record browser baseline.
- [ ] Record perf baseline.

## P2.1 draw canvas orchestration owner

- [ ] Start only after the green baseline is recorded.
- [ ] Extract `js/core/map_renderer/draw_canvas_orchestration_owner.js`.
- [ ] Preserve `drawCanvas()` undefined return, phase/defer double-read, and effect order.
- [ ] Reach at least 35 extracted lines.

## P2.2a cached pass compositor owner

- [ ] Extract `js/core/renderer/cached_pass_compositor_owner.js`.
- [ ] Preserve active target context, transform math, compose result schema, and wrapper shape.

## P2.2b transformed frame compositor owner

- [ ] Extract `js/core/map_renderer/transformed_frame_compositor_owner.js`.
- [ ] Preserve boolean return, HGO/dirty/reuse/order semantics, and composition-root global writes.

## Review / UltraQA / integration

- [ ] Reach cumulative extracted lines >=150.
- [ ] Run independent code review, first-principles review, and UltraQA.
- [ ] Recheck integration ancestry and overlap.
- [ ] Push verified result.
- [ ] Clean isolated worktree after recovery recording.
