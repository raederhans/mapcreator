# Startup Political Render Stability Context

## 2026-05-17
- Created isolated worktree and branch: `codex/startup-political-render-stability`.
- Created Ultragoal aggregate story and active Codex goal.
- Current implementation target is narrow: startup first political frame, ocean-fill invalidation, partial repaint gate, and targeted contracts.

## Evidence Notes
- Prior plan review identified `js/main.js` startup ordering as a likely direct cause of slow first visible map.
- `political` pass signatures include `ocean-fill`, so scenario ocean fill/style changes must invalidate political caches.
- `tryPartialPoliticalPassRepaint` currently admits `rebuild-colors`; the fix should reserve partial repaint for targeted `refresh-colors`.

## Implementation Notes
- Moved the startup scenario first-frame flush before deferred UI bootstrap await/replay using `bootstrap-first-political-frame`.
- Added a first-visible political currentness gate around `firstVisibleFramePainted`.
- Expanded ocean background invalidation to dirty political/context passes that depend on `ocean-fill`.
- Restricted political partial repaint and dirty-id retention to targeted `refresh-colors`.
- Added blocked-first-frame diagnostics for `base-visible-fallback`, `stale-political-signature`, and `stale-ocean-fill`.

## Verification Notes
- Unit/contract coverage passed for startup shell, startup scenario boot boundary, palette runtime bridge, physical layer contracts, scenario chunk contracts, runtime state behavior, renderer public contracts, TNO water geometries, TNO bundle builder, and strict TNO scenario contracts.
- `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962` refreshed stale generated scenario snapshots; strict rerun passed without writes.
- `npm run perf:gate` passed with zero gate failures and zero baseline contract mismatches.
- Final focused Playwright smoke passed on current code after the second strict safe-write: `node node_modules/@playwright/test/cli.js test tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js --grep "tno zoom-end keeps Great Lakes Congo political detail fill stable" --workers=1 --retries=0`.
- One earlier misquoted Playwright command broadened to 15 TNO/ocean tests; the target smoke and Mediterranean dedicated-fill smoke passed, while two adjacent interaction/ocean-click tests failed. The final focused rerun is the accepted browser gate for this task.
- Final static review returned `APPROVE`; architecture review returned `CLEAR`.
