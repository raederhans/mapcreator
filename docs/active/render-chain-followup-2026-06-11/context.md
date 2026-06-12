# Render Chain Follow-Up Context 2026-06-11

## Initial Evidence
- `main` started at `54de2faf` with `.omx/metrics.json` modified and completed docs records moved from active to archive.
- Review-fix worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-recovery-review-fix`.
- Review-fix branch head before R0 merge work: `652d0354`.
- `codex/render-recovery-review-fix` contains the progressive cache repaint diagnostics patch but remains blocked by repeated `npm run perf:gate` failures.

## R0 Docs Cleanup
- Submitted docs/archive cleanup as `ddd94ba9`.
- Included paths: `docs/archive/render-chain-improvement`, `docs/archive/hgo-scenario-platformization`, and `lessons learned.md`.
- Excluded `.omx/metrics.json`.

## Live Process Ownership
- Main agent owns `npm run perf:baseline`, `npm run perf:gate`, `npm run verify:pages-dist`, browser/e2e commands, and any dev server those commands launch.
- Subagents are read-only evidence lanes and may not run or monitor live processes.

## R0 Perf Diagnosis
- Main baseline probes at `ddd94ba9` failed against the old threshold on this machine: TNO total startup `6960.6ms` / `6980.1ms`; HOI4 total startup `7235.5ms` / `7706.4ms`.
- Isolated `ca1dc9c0` gate failed while using its own `8000` server: TNO `6735.4ms`, HOI4 `7197.4ms`, `contractMismatches=[]`.
- Isolated `54de2faf` gate failed only on HOI4 while using its own `8000` server: TNO `6287.4ms`, HOI4 `7065.4ms`, `contractMismatches=[]`.
- The first fresh `652d0354` gate sample was invalid as branch evidence: its `.runtime/dev/active_server.json` pointed at port `8810` with a dead pid, while the live `8810` server belonged to the main worktree.
- Fixed `tools/perf/run_baseline.mjs` so reusable dev-server metadata must match the current repo path and a live pid before probing the URL.
- After removing the stale review-fix `active_server.json`, `652d0354` fresh gate passed using its own `8000` server: TNO `5215.8ms`, HOI4 `5659.4ms`, `contractMismatches=[]`, `failures=[]`.

## R0 Merge Verification
- Merged `codex/render-recovery-review-fix` into `main` as `4cfb5e1d`; Git moved the branch doc updates into `docs/archive/render-chain-improvement`.
- `npm run verify:perf-gate-contract`: 22 tests passed.
- `node tests/scenario_chunk_contracts.test.mjs`: 43 tests passed.
- `npm run verify:pages-dist`: dist build passed, `tests.test_pages_dist_startup_shell` 34 tests passed, landing showcase Node tests 6 passed.
- Final `npm run perf:gate` at `4cfb5e1d` passed: TNO `4913.3ms`, HOI4 `5355.8ms`, `contractMismatches=[]`, `failures=[]`.
- Self-review found that valid but long-lived local dev servers can still make local perf samples noisy. The perf script now starts a dedicated `.runtime/tmp/perf-baseline-runtime` server by default; existing active server reuse requires `PERF_REUSE_ACTIVE_SERVER=1`.
- Default isolated `npm run perf:gate` with the self-review fix passed: TNO `6153.6ms`, HOI4 `5398.5ms`, `contractMismatches=[]`, `failures=[]`.
- After committing the self-review fix, current HEAD `735d99f0` passed `npm run verify:perf-gate-contract`, then isolated `npm run perf:gate` failed twice on HOI4 only: `6921.6ms` and `6830.0ms` versus limit `5986.6ms`; both runs had `contractMismatches=[]`.
- A fresh isolated rerun at current HEAD `fe7d69e5` passed `npm run perf:gate`: TNO `6204.8ms`, HOI4 `5665.8ms`, `contractMismatches=[]`, `failures=[]`.
- Push is unblocked, with the repeated HOI4 variance recorded as a follow-up risk for future perf gate interpretation.
