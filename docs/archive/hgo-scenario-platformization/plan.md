# HGO Scenario Platformization Plan

## Outcome

HGO becomes a registered, editable vector scenario while the developer raster preview is repaired as a normal render pass.

## Phase Checklist

- [x] Phase 0: prove current projection/render failure with small tests and diagnostics.
- [x] Phase 1: add hgoPreview render pass, remove main-canvas raster overwrite, and cover pass contracts.
- [x] Phase 2: add HGO vector scenario builder, generate/register hgo_1936, and verify scenario contracts.
- [x] Phase 3: repair owner tag normalization and validate fill/batch/eyedropper/undo identity flow for HGO feature ids.
- [x] Phase 4: add performance/release hardening and prove scene mode keeps BMP isolated from normal scenario loading.
- [x] Final review: run bug review, simplify where possible, and rerun verification.
- [ ] Closeout: merge, push, and clean the worktree.

## File Ownership Plan

Main agent owns shared render and scenario integration files:
- js/core/map_renderer.js
- js/core/state/renderer_runtime_state.js
- js/core/renderer/render_pipeline_passes.js
- package.json
- data/scenarios/index.json
- tools/build_pages_dist.py

Subagents may work on bounded, mostly disjoint slices:
- HGO scenario builder tests and invariants.
- Edit identity tests and call-site audit.
- Final read-only review.

## Live Process Ownership

Current owner: main agent.

Active live process: none.

Logs:
- Long tests/builds will write to .runtime/tests/ or .runtime/reports/generated/.
- Other agents may read completed logs only.

## Verification Gates

- npm run verify:hgo-runtime-poc
- npm run test:node:hgo-projection-model
- npm run test:node:hgo-raster-renderer
- npm run test:node:hgo-runtime-preview
- python -m unittest tests.test_hgo_runtime_seed_builder -q
- python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hgo_1936 --report-path .runtime/reports/generated/hgo_1936.strict_contract_report.json
- npm run verify:pages-dist
- npm run perf:gate, or a documented scoped substitute if full perf is blocked by environment/runtime cost

## Current Status

2026-06-11T02:42:58Z:
- Worktree created from origin/main.
- User plan and project rules loaded.
- Ralph context snapshot created.

2026-06-11:
- Added hgoPreview pass to render pass lists and owner.
- HGO preview controller can now target a pass canvas while keeping toolbar default rendering inside the pass lifecycle.
- Removed drawCanvas direct HGO raster overwrite and HGO-specific last-good fast path.
- Verified with npm run test:node:hgo-runtime-preview, runtime hook/render pass boundary tests, renderer runtime state tests, and JS syntax checks.
- Added DPR/zoom/size matrix tests and identity-pass affine reuse test in tests/hgo_projection_model.node.test.mjs.
- Added HGO vectorizer/compiler/tool under scenario_builder/hgo and tools/build_hgo_scenario.py.
- Generated and registered data/scenarios/hgo_1936 with 11,894 state features and 570 owner tags.
- Added hgo_vector contract profile, HGO strict contract script, builder test, and scene-mode BMP isolation test.
- Repaired A-Z0-9 country/owner normalization and verified digit-prefixed owner edits with 2RA.
- Verified hgo_1936 strict contract with .runtime/reports/generated/hgo_1936.strict_contract_report.json.
- Final review found four issues and all were fixed: NUTS id fallback now stays alphabetic, HGO retired controller output is removed, custom output dirs skip scenario index updates, and capital_hints.json participates in strict snapshot fingerprints.
- Final verification passed for HGO runtime POC, HGO strict scenario contracts, targeted identity/builder/snapshot tests, Pages dist, syntax checks, and git diff whitespace checks.
- `npm run perf:gate` remains red for `hoi4_1939.totalStartupMs`; a clean origin/main control worktree reproduced the same failure with no contract mismatches, so this is recorded as an environment/baseline blocker outside the HGO branch diff.
