# P13 Render Pipeline Catalog Extraction Context

## 2026-06-26 00:45 UTC

- Parent checkout is dirty with unrelated `docs/archive/**` deletions and `lessons learned.md` edits; P13 uses a clean isolated worktree.
- Initial probes:
  - parent `git status --short`: unrelated docs/archive deletion WIP plus lessons file.
  - parent `git worktree list`: parent main and P13 worktree.
  - parent `git rev-parse HEAD`: `383a626acd4f15002a80ff20e235a4103581ab43`.
  - parent `git rev-parse origin/main`: `0f07d9943dfec2b1245320160306e4d6dd3519f7`.
- P13 worktree HEAD is `origin/main@0f07d9943dfec2b1245320160306e4d6dd3519f7`.
- Static subagents:
  - code-mapper: confirmed idle definitions live in `createRenderPipelinePassesOwner` and order is a strict contract.
  - test-engineer: recommended tests and boundary coverage; naming was adjusted to match the P13 attachment.
  - architect: pending at this checkpoint.
- Implemented:
  - added `IDLE_RENDER_PASS_DEFINITIONS`.
  - changed owner mapping to `drawKey` lookup with a noop draw fallback.
  - added `tests/render_pipeline_catalog_behavior.test.mjs`.
  - updated `tools/check_architecture_boundaries.mjs`.
  - updated `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`.
  - added `test:node:render-pipeline-catalog`.
- Early validation passed:
  - `node --check js/core/renderer/render_pipeline_catalog.js`
  - `node --check js/core/renderer/render_pipeline_passes.js`
  - `node --check tests/render_pipeline_catalog_behavior.test.mjs`
  - `node --check tools/check_architecture_boundaries.mjs`
  - `npm run test:node:render-pipeline-catalog` 3/3
  - `npm run verify:architecture-boundaries`
  - `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` 5/5
- Observed existing Node warning: module type is not declared in `package.json`; Node reparses ESM test imports. This warning is already common for these node tests.

## 2026-06-26 00:58 UTC

- Full requested validation passed:
  - `npm run test:node:render-pass-catalog` 6/6
  - `npm run test:node:render-invalidation-catalog` 6/6
  - `npm run test:node:render-cache-owner` 6/6
  - `npm run test:node:render-pipeline-catalog` 3/3
  - `npm run test:node:renderer-host-inventory` 7/7
  - `npm run test:node:renderer-runtime-state-behavior` 10/10
  - `npm run test:node:render-transaction-diagnostics` 21/21
  - `npm run test:node:scenario-refresh-plans` 23/23
  - `npm run test:node:exact-after-settle-refresh-plans` 8/8
  - `npm run test:node:canvas-layer-manager` 4/4
  - `npm run test:node:scenario-chunk-contracts` 57/57
  - `npm run verify:architecture-boundaries`
  - `npm run verify:state-write-allowlist`
  - `npm run verify:test-import-graph`
  - `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` 5/5
  - `npm run test:e2e:dev:tno-ready-state` 5/5
  - `npm run test:e2e:smoke` 4/4
  - `git diff --check` exited 0 with Windows LF-to-CRLF warnings for edited tracked files.
- E2E used a temporary ignored `node_modules` junction to `C:\Users\raede\Desktop\dev\mapcreator\node_modules`; it was removed after validation.
- E2E smoke still reports local auth `/api/backend/auth/me` 401 and D3 unsafe water geometry warnings for `marine_arctic_ocean` / `marine_southern_ocean`; tests passed with these known environment/runtime diagnostics.
- Architect static review returned `BLOCKED` for two recommendations:
  - rename the new catalog to an idle-specific filename;
  - sync `dist/app/**`.
- Resolution: keep the filename and omit dist edits because the P13 attachment explicitly requires `js/core/renderer/render_pipeline_catalog.js` and explicitly forbids modifying `dist/app/**`. The semantic ambiguity risk is covered by `IDLE_RENDER_PASS_DEFINITIONS`, the behavior test, architecture boundary ownership rule, and Python boundary contract.
- Code review returned CLEAR:
  - idle pass order matches P13;
  - owner maps catalog `drawKey` to draw callbacks with noop fallback;
  - `ensureIdleRenderPasses` filtering and prepare/runtime logic remain in owner;
  - forbidden files were absent from diff.
- First-principles self-check: the smallest stable boundary is a pure data catalog plus owner mapping; no runtime behavior or generated dist surface was needed to satisfy P13's stated extraction goal and constraints.

## Live Process Ownership

- Main agent owns all validation commands, including Node tests, Python tests, architecture checks, and E2E smoke/dev gates.
- Subagents may inspect source and report static findings. They do not own live commands.
