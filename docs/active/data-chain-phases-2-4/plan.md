# Data Chain Phases 2-4 Plan

## Goal

Continue the data-chain cleanup after build-time contract consolidation without changing runtime data formats or user-visible behavior.

## Boundaries

- Phase 2: shrink transport pack builder duplication by extracting shared file signature, archive marker, and line pack helpers.
- Phase 3: shrink transport preview duplication by moving road/rail shared line utilities into the shared line runtime and separating point preview runtime helpers from renderer glue.
- Phase 4: shrink renderer transaction boundaries by extracting shared reset and derived-state helpers around `setMapData`, scenario apply, and chunk promotion.
- Do not rewrite renderer architecture, transport manifest formats, or checked-in data payload schemas.
- Do not add browser runtime dependencies.

## Acceptance Criteria

- Existing behavior stays locked by targeted tests before and after refactors.
- Reused helpers replace duplicated code with equivalent outputs.
- Transport manifest, catalog, and Pages dist contracts stay green when touched.
- Any helper introduced has one clear owner and a narrow name matching existing project vocabulary.

## Work Plan

- [x] Intake: map current Phase 2/3/4 code paths and tests.
- [x] Phase 2: implement builder helper extraction and targeted tests.
- [x] Phase 3: implement preview helper extraction and targeted node tests.
- [x] Phase 4: implement renderer reset/derived-state helper extraction and targeted tests.
- [x] Review: run independent code review and fix findings.
- [x] QA: run targeted tests, `verify:pages-dist` if publish surface changes, and final diff checks.
- [ ] Archive: move this folder to `docs/archive/data-chain-phases-2-4` after completion.

## Initial Verification Targets

- `python -m py_compile` on changed Python files.
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_manifest_contracts tests.test_data_manifest_contract -q`
- Targeted node tests for changed preview modules.
- Targeted renderer boundary tests for changed renderer modules.
- `npm run verify:pages-dist` if dist or Pages manifest changes.

## Progress

- 2026-06-14: Created isolated worktree from `origin/main`; started read-only mapping lanes for Phases 2, 3, and 4.
- 2026-06-14: Phase 2 implemented small builder boundaries: `transport_country_pack_writer.py` owns pack layer write/count/bbox helpers; `transport_source_extract_cache.py` owns source/archive marker read/write comparison; country real pack builder keeps source recipes and family-specific filtering.
- 2026-06-14: Phase 3 moved road/rail SVG/path/number/order helpers into `transport_workbench_line_runtime_shared.js`; road and rail preview files now import aliases and keep their family-specific visibility, styling, label, and station rules.
- 2026-06-14: Phase 4 added private renderer helpers for transaction reset, topology revision marking, primary political collection rebuild, and primary derived-state rebuild. `setMapData`, scenario apply, and chunk promotion now share those helpers while preserving previous option differences.
- 2026-06-14: Validation passed for Python compile, JS syntax checks, targeted unittest suites, line helper inline behavior, transport preview/overview/runtime node tests, and `npm run verify:pages-dist`.
- 2026-06-14: `npm run test:node:scenario-chunk-contracts` still fails on existing `hoi4_1939` checked-in coarse chunk bounds mismatch: expected 23426, actual 23375. The failure is in checked-in scenario data counts and does not overlap changed files.
- 2026-06-14: Independent read-only review found no code-level blocker after new helper files are included. It flagged Pages manifest generated size changes as watch-only; `npm run verify:pages-dist` passed against the regenerated manifest.

## Remaining Scope Notes

- Phase 2 still has deeper country/family line builder table-driving opportunities. This pass only extracted the stable write/signature/marker boundary.
- Phase 3 still has a larger point preview runtime/renderer split. This pass only moved shared road/rail pure helpers because point preview mixes edit overlay, aggregation, labels, and SVG rendering in one stateful file.
- Phase 4 still has deeper renderer owner extraction opportunities. This pass kept helpers private inside `map_renderer.js` to avoid expanding renderer public contracts.
