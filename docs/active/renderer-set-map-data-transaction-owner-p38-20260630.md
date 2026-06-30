# Renderer setMapData Transaction Owner P38

## Plan

- Preserve `setMapData` as the stable wrapper in `js/core/map_renderer.js`.
- Add `createSetMapDataTransactionOwner` under `js/core/map_renderer/set_map_data_transaction_owner.js`.
- Move orchestration order into the owner through required injected effects and getters.
- Keep runtime state writes and module-local writes inside map_renderer-provided effects.
- Add behavior coverage for the owner and update inventory/architecture gates from P37 preflight to P38 implementation.
- Keep the P37 preflight document as the historical baseline, and make this document the P38 implementation-state contract.

## Implementation Contract

P38 changes the boundary from "owner absent" to "owner present":

- `js/core/map_renderer/set_map_data_transaction_owner.js` exists and owns only the `setMapData` transaction order.
- `js/core/map_renderer.js` remains the composition root and keeps the public wrapper with the current defaults.
- The wrapper delegates normalized options to `runSetMapDataTransaction`.
- Direct writes to renderer runtime and module-local variables remain in `map_renderer.js` injected effects.
- `js/core/map_renderer/public.js`, scenario refresh runtime, exact-after-settle scheduler, state-write allowlist, render lifecycle, hit canvas build, strategic overlay runtime, and Pages dist remain outside this change.

The owner dependency contract is explicit:

- Required getters provide `nowMs`, active scenario id, land feature count, and render profile.
- Required effects provide every transaction side effect in the existing order, including perf metrics.
- Composite coverage logging stays behind an injected diagnostic effect that receives the rebuilt collections.
- The owner returns a frozen diagnostic summary with `reason`, normalized `options`, `shouldDeferInteractionInfrastructure`, `staged`, and effect order.

The architecture checker must enforce the implementation state:

- Require the new owner file and behavior test.
- Keep `renderer_render_lifecycle_owner.js` absent.
- Add the owner to line-budget checks and source scanning.
- Check owner forbidden tokens and renderer wiring tokens.
- Keep the P37 preflight document checks as historical guardrails.

## Progress

- Intake complete: P37 guardrails, current `setMapData`, public facade, scenario bridge, scenario/post-apply callers, scenario refresh runtime, exact scheduler, existing renderer owners, architecture checker, state-write allowlist, package scripts, and lessons learned were inspected.
- Architect review returned BLOCK on missing P38 implementation-state contract, perf/composite dependency contract, and checker budget/source-scan contract.
- Current implementation phase: P38 plan contract repaired before critic review.
- Critic review approved the repaired plan with WATCH on checker/inventory migration.
- Second architect review approved the repaired plan with WATCH on checker migration.
- OMX CLI state transition to `ultragoal` is blocked in Codex App because the CLI expects tmux tracker-backed native lanes; this run records the App-native subagent evidence in this document and continues implementation.
- Implementation complete: owner added, renderer wrapper delegated, behavior/inventory/checker/package updated.
- Protected file check complete: `js/core/map_renderer/public.js`, `js/core/map_renderer/scenario_refresh_runtime.js`, `js/core/map_renderer/exact_after_settle_scheduler.js`, and `tools/eslint-rules/state-writer-allowlist.json` have no diff.
- Render/hit/scenario/exact/strategic migration check complete: those anchors remain outside the new owner, and owner forbidden-token search returned no matches.

## Validation Results

- `node --check js/core/map_renderer/set_map_data_transaction_owner.js`: pass
- `node --check js/core/map_renderer.js`: pass
- `node --check tests/renderer_set_map_data_transaction_owner_behavior.test.mjs`: pass
- `node --check tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs`: pass
- `node --check tools/check_architecture_boundaries.mjs`: pass
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`: pass
- `npm run test:node:renderer-set-map-data-transaction-owner`: pass, 7/7
- `npm run test:node:renderer-set-map-data-transaction-inventory`: pass, 11/11
- `npm run test:node:renderer-set-map-data-transaction`: pass, 18/18 combined
- `npm run test:node:renderer-startup-transaction-owner`: pass, 8/8
- `npm run test:node:renderer-startup-transaction-inventory`: pass, 9/9
- `npm run test:node:renderer-fit-projection-lifecycle`: pass, 23/23
- `npm run test:node:renderer-viewport-update-owner`: pass, 5/5
- `npm run test:node:renderer-runtime-state-behavior`: pass, 10/10
- `npm run test:node:render-transaction-diagnostics`: pass, 21/21
- `npm run test:node:scenario-refresh-plans`: pass, 24/24
- `npm run verify:architecture-boundaries`: pass
- `npm run verify:test-import-graph`: pass, 50 specs
- `npm run verify:state-write-allowlist`: pass, 115 tracked files
- `git diff --check`: pass with Windows LF-to-CRLF working-copy warnings only

## Current Risks

- Browser/E2E smoke was not run yet because the required P38 scope is owner extraction and the targeted Node/static gates cover the transaction order and boundary contracts.
- Current checkout also contains pre-existing Phase5B docs and registry edits; P38 staging must avoid unrelated Phase5B files.

## Review And QA

- Code review: COMMENT / CLEAR, no findings. Reviewer reminder: include the untracked owner and owner behavior test when staging.
- QA: PASS / CLEAR, no required follow-ups.
- Optional QA note: if P38 and Phase5B are integrated together, rerun `npm run test:node:renderer-set-map-data-transaction`, `npm run test:node:renderer-startup-transaction-owner`, and `npm run test:node:scenario-refresh-plans` after integration.
- Optional static note completed: main `setMapData(...)` callers in `js/main.js`, `js/core/scenario_manager.js`, `js/core/scenario_post_apply_effects.js`, `js/bootstrap/ui_shell_boot.js`, `js/bootstrap/deferred_detail_promotion.js`, and `js/core/scenario/scenario_renderer_bridge.js` do not consume the return value.

## Delivery Package

1. Changed: added the P38 owner, delegated the stable `setMapData` wrapper, kept state writes in injected effects, upgraded P38 tests/checker/scripts, and recorded the integration package.
2. Files: core `js/core/map_renderer.js`, `js/core/map_renderer/set_map_data_transaction_owner.js`; tests `tests/renderer_set_map_data_transaction_owner_behavior.test.mjs`, `tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs`; docs `docs/active/renderer-set-map-data-transaction-owner-p38-20260630.md`, `docs/active/_worktree_registry.md`; tooling `tools/check_architecture_boundaries.mjs`; package `package.json`.
3. Diff summary: wrapper shrinks to owner delegation; new owner preserves original transaction order via injected getters/effects; behavior/inventory/checker gates now enforce P38 implementation state.
4. Commit status: uncommitted before final staging; base and current `main` both `6c0400c58c21f27e6f1c862c586506d0290b02b1`.
5. Conflicts: yellow with Phase5B for registry docs; green for current planned production paths; yellow with future renderer extraction touching `map_renderer.js`, package scripts, or checker.
6. Integration recommendation: merge P38 before Phase5B, or rebase Phase5B after P38 and rerun P38 transaction/startup/scenario refresh tests.

## Validation Plan

- `node --check js/core/map_renderer/set_map_data_transaction_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_set_map_data_transaction_owner_behavior.test.mjs`
- `node --check tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-set-map-data-transaction-owner`
- `npm run test:node:renderer-set-map-data-transaction-inventory`
- `npm run test:node:renderer-startup-transaction-owner`
- `npm run test:node:renderer-startup-transaction-inventory`
- `npm run test:node:renderer-fit-projection-lifecycle`
- `npm run test:node:renderer-viewport-update-owner`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `git diff --check`
