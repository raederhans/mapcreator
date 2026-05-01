# test-system-routing-overhaul plan

## Intent
把测试入口改成可路由、可解释、资源归属明确的薄调度层。

## Acceptance criteria
- `node tools/select_verification_targets.mjs --check` passes.
- `npm run verify:test:e2e-layers` passes.
- `node tools/e2e_layering.mjs list-domain city-runtime` prints matching specs.
- `node tools/e2e_layering.mjs explain tests/e2e/tno_1962_ui_smoke.spec.js` prints route metadata.
- `python -m unittest tests.test_perf_gate_contract -q` passes.
- `npm run test:node:scenario-chunk-contracts` passes.

## Constraints
- Keep existing npm scripts and CI check names stable.
- Main thread owns Playwright/perf/dist/checkpoint/bundle and long discover.
- Child lanes stay read-only or static/short evidence only.
- Runtime artifacts go under `.runtime/`.

## Worklist
- [x] Add route schema/metadata.
- [x] Update E2E layering run/generate boundaries.
- [x] Add domain/owner/explain commands.
- [x] Add read-only verification selector.
- [x] Include Python heavy groups and Node contract scripts in route index.
- [x] Run targeted verification.
