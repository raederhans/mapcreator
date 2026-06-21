# Stage 5 Visual Acceptance Task

## Current Status

- Status: ready-for-integration.
- Base: `origin/main@8e79ea0cebb3a44d89247dc6094baca9f25b22c9`.
- Branch: `codex/stage5-visual-acceptance`.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-stage5-visual-acceptance`.
- Commit state: commit pending; final report records the resulting commit hash.

## Delivery Package

1. What changed:
   - Added a Stage 5 dev E2E visual acceptance harness with 9 required cases.
   - Captured screenshots under `.runtime/browser/mcp-artifacts/stage5-visual-acceptance/`.
   - Wrote diagnostics to `.runtime/output/render-diagnostics/stage5-visual-acceptance.json` and summary to `.runtime/output/visual-acceptance/stage5-summary.json`.
   - Fixed the runtime contract by making TNO require `relief` with `water` and `scenario_atlantropa`.
   - Refreshed the existing scenario chunk contract test, E2E import graph, state-writer allowlist, and Pages dist mirror.

2. Files changed:
   - Core files: `js/core/scenario_chunk_manager.js`, `dist/app/js/core/scenario_chunk_manager.js`.
   - Test files: `tests/e2e/dev/full_visual_acceptance.dev.spec.js`, `tests/e2e/test-import-graph.json`, `tests/scenario_chunk_contracts.test.mjs`.
   - Tooling files: `package.json`, `tools/eslint-rules/state-writer-allowlist.json`, `dist/pages-dist-manifest.json`.
   - Documentation files: `docs/active/_worktree_registry.md`, `docs/active/stage5-visual-acceptance/plan.md`, `docs/active/stage5-visual-acceptance/context.md`, `docs/active/stage5-visual-acceptance/task.md`.
   - Temporary ignored files: `.omx/ultragoal/brief.md`, `.omx/ultragoal/goals.json`, `.omx/ultragoal/ledger.jsonl`, `.runtime/...`.

3. Diff summary:
   - `scenario_chunk_manager.js`: TNO required semantic layer list now includes `relief`.
   - `scenario_chunk_contracts.test.mjs`: existing TNO required-layer assertion now expects `scenario_atlantropa`, `water`, and `relief`.
   - `full_visual_acceptance.dev.spec.js`: records screenshots, runtime diagnostics, canvas pixel samples, political fill samples, queued scenario switch result, and actionable issue counts for 9 cases.
   - `package.json`: adds `test:e2e:dev:stage5-visual-acceptance`.
   - Dist and generated graph files were refreshed from the source changes.

4. Commit state:
   - Commit pending. Independent review is complete; this package is ready for staging and commit.

5. Base divergence:
   - The worktree base matches `origin/main@8e79ea0cebb3a44d89247dc6094baca9f25b22c9`.
   - Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is dirty and behind remote, so integration should use a clean integration path that preserves parent WIP.

6. Conflict / overlap check:
   - Direct red overlap with `mapcreator-layer-observability`: `package.json`, `dist/pages-dist-manifest.json`, and generated `dist/app/js/core/scenario_chunk_manager.js`.
   - Yellow semantic overlap with `mapcreator-layer-observability` because both tasks touch render diagnostics and layer visibility evidence.
   - Direct overlap with parent WIP is expected only in docs/registry/lessons learned, based on current parent status.
   - Hot files touched: scenario chunk selection contract, dev E2E entry list, generated Pages dist.

7. Verification run:
   - PASS `node --check tests/e2e/dev/full_visual_acceptance.dev.spec.js`.
   - PASS `node --test tests/scenario_chunk_contracts.test.mjs` with 55 tests.
   - PASS `npm run verify:test-import-graph`.
   - PASS `npm run verify:test:e2e-layers`.
   - PASS `npm run verify:test-timeout-guardrails`.
   - PASS `npm run test:e2e:tno-contracts` with 2 tests.
   - PASS `npm run test:e2e:dev:stage5-visual-acceptance`; 9/9 acceptance cases, summary `pass=true`.
   - PASS `npm run verify:pages-dist`; startup shell 38 tests OK and landing showcase 8 tests OK.
   - PASS `git diff --check` with line-ending warnings only.
   - FAIL `npm run test:e2e:water-rendering`; clean `origin/main` baseline reproduced the failing open-ocean and named-water families.
   - FAIL `npm run verify:architecture-boundaries`; baseline `js/core/map_renderer.js` line budget issue, file untouched here.
   - FAIL `npm run verify:state-write-allowlist`; baseline unexpected writer list, new Stage 5 spec allowlisted.

8. Remaining risk:
   - `test:e2e:water-rendering` has baseline failures that should be tracked separately before treating the full water suite as a release gate.
   - `verify:architecture-boundaries` and `verify:state-write-allowlist` are existing mainline gate debt.
   - Integration must account for parent dirty docs WIP and any active `mapcreator-layer-observability` overlap.
   - `mapcreator-layer-observability` should refresh or regenerate shared dist files after Stage 5 lands.

9. Recommended next step:
   - Commit this worktree and enter integration.
   - Recommended integration: fast-forward `main` from this branch if `origin/main` remains `8e79ea0cebb3a44d89247dc6094baca9f25b22c9`; otherwise rebase or merge from latest `origin/main` in a clean integration path, run the Stage 5 gate and `verify:pages-dist`, then push.
   - Hold full `test:e2e:water-rendering` as a separate baseline repair item.

10. Integration answer:
   - This worktree is functionally ready to integrate.
   - Integrate as one focused Stage 5 commit because the harness and relief required-layer fix prove the same acceptance gap.
