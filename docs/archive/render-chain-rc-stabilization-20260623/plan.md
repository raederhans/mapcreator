# Render Chain RC Stabilization Plan

## Classification

- Task level: complex + integration-readiness.
- Base: `origin/main@6196e737dbbe211f5dbdb63b7a8a0f9749b30403`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-rc-render-chain-stabilization-20260623`.
- Branch: `codex/rc-render-chain-stabilization-20260623`.

## Boundaries

- Verify the current pushed render chain baseline.
- Do not edit Thematic, Appearance, or Map Content UI.
- Do not change renderer behavior unless a fresh production regression is proven.
- Preserve the parent checkout UI/palette/startup WIP untouched.
- Only clean stale test contracts if current-base drift is reproduced and classified.

## Plan

1. Establish baseline.
   - Record `origin/main`.
   - Confirm parent checkout WIP is isolated.
   - Register the clean worktree.
2. Run read-only stability verification.
   - Full scenario chunk runtime.
   - Full non-1962 runtime matrix file.
   - Phase 1/2A/2B/2C Node suites.
   - Requested Python boundary suites.
   - Pages dist and diff checks.
3. Classify stale contract drift if any.
   - Confirm whether any failing broader/manual bridge contract expects the retired import.
   - Update only the stale test contract if the failure is current-base drift.
4. Rerun affected verification.
   - Prove cleanup did not change renderer behavior.
5. Deliver RC stabilization report.
   - Archive docs if complete.
   - Commit and push only if there are intentional docs/test-contract changes.
   - Clean the temporary worktree after integration or no-op closeout.

## UltraQA Scenario Matrix

| ID | Intent | Command / Harness | Expected Signal | Cleanup |
| --- | --- | --- | --- | --- |
| RC-BASE-001 | TNO chunk runtime baseline | `npm run test:e2e:dev:scenario-chunk-runtime` | 8/8 pass | Playwright artifacts only under `.runtime`/test output |
| RC-MATRIX-002 | Non-1962 runtime coverage | `node node_modules/@playwright/test/cli.js test tests/e2e/non_1962_runtime_matrix.spec.js --workers=1 --retries=0` | File-level matrix pass with reported coverage | Runtime reports under `.runtime/reports/generated` |
| RC-CONTRACT-003 | Phase 1/2A/2B/2C Node contracts | Requested Node suites | All pass | No tracked generated debris |
| RC-PY-004 | Python boundary contracts | Requested Python unittest modules | All pass or stale contract classified | No tracked generated debris |
| RC-DIST-005 | Published dist baseline | `npm run verify:pages-dist` and `git diff --check` | Pass, with dist drift handled explicitly | No unreviewed source drift |
| RC-STALE-006 | Contract drift guard | Only if a current-base stale contract fails | Test contract cleanup only | Affected suites rerun |

## Live Process Ownership

- Main agent owns every long-running test, Pages dist build, dev server, and cleanup command.
- Subagents or secondary analysis lanes may inspect completed logs only.
