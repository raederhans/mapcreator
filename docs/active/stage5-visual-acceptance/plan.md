# Stage 5 Visual Acceptance Plan

## Boundary

- Start from `origin/main@8e79ea0cebb3a44d89247dc6094baca9f25b22c9` in `C:\Users\raede\Desktop\dev\mapcreator-stage5-visual-acceptance`.
- Preserve the dirty parent checkout at `C:\Users\raede\Desktop\dev\mapcreator`.
- Prove visual correctness with browser screenshots, pixel samples, feature/layer counts, diagnostics snapshots, and performance smoke.
- Keep scenario apply ownership, political/color readiness, semantic layer coverage contracts, chunk selection, render budget hints, worker/offscreen/webgl/vector tile defaults, and performance thresholds unchanged.

## Work Plan

- [x] Create isolated worktree and activate a single Stage 5 Codex goal.
- [x] Load project rules, lessons learned, Stage 4 evidence, and registry state.
- [x] Map existing E2E, diagnostics, screenshot, and pixel-probe helpers.
- [x] Implement the smallest visual acceptance harness as a dev E2E gate.
- [x] Capture Stage 5 screenshots and machine-readable summaries for TNO, Atlantropa, water, relief, fill zoom/pan, scenario switch, and two non-TNO scenarios.
- [x] Classify failures before editing production code.
- [x] Apply the narrow runtime-contract repair proven by Stage 5 evidence.
- [x] Run targeted syntax, Node, E2E, Pages dist, and static verification checks.
- [x] Run cleanup/self-review and independent code-review lanes.
- [ ] Commit, integrate into `main`, push, and clean the worktree if all gates pass.

## Acceptance Cases

- `tno_startup_idle`
- `tno_atlantropa_mediterranean`
- `tno_water_regions`
- `relief_overlay_visible`
- `fill_before_zoom`
- `fill_after_zoom_pan`
- `scenario_switch_final`
- `non_tno_startup_1`
- `non_tno_startup_2`

## Required Metrics

- stable warning count, by code, and by layer.
- active scenario identity consistency.
- water, `scenario_atlantropa`, and relief coverage/source snapshots.
- political feature/color counts for startup scenarios.
- sampled near-black land-fill anomalies.
- sampled transparent or missing required-layer anomalies.
- screenshot path per case.
- startup/render smoke metrics available from existing benchmark hooks.

## Validation Queue

- `node --check tests/e2e/dev/full_visual_acceptance.dev.spec.js` - PASS.
- `node --test tests/scenario_chunk_contracts.test.mjs` - PASS, 55 tests.
- `npm run verify:test-import-graph` - PASS, graph rebuilt for 49 specs.
- `npm run verify:test:e2e-layers` - PASS.
- `npm run verify:test-timeout-guardrails` - PASS.
- `npm run test:e2e:tno-contracts` - PASS, 2 tests.
- `npm run test:e2e:dev:stage5-visual-acceptance` - PASS, 1 test with 9 acceptance cases.
- `npm run verify:pages-dist` - PASS, Pages startup shell 38 tests and landing showcase 8 tests.
- `git diff --check` - PASS with line-ending warnings only.
- Independent code-review lane - APPROVE after offscreen-probe and queued-switch evidence fixes.
- Architect review lane - WATCH only; queued-switch evidence was strengthened in the harness.
- `npm run test:e2e:water-rendering` - FAIL, baseline-reproduced on clean `origin/main` for open-ocean apply timeout and named-water inspector active-title failure.
- `npm run verify:architecture-boundaries` - FAIL, baseline `js/core/map_renderer.js` line budget 24154 > 24100; this worktree does not edit that file.
- `npm run verify:state-write-allowlist` - FAIL, baseline unexpected writer list; the new Stage 5 spec is allowlisted and absent from the unexpected list.
