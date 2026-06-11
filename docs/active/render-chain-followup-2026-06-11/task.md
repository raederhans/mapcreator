# Render Chain Follow-Up Task

## UltraQA Scenario Matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0-DIRTY | Existing dirty checkout | Keep `.omx/metrics.json` out of commits while archiving docs | `git status`, staged diff | Product commit excludes runtime metrics | `.omx/metrics.json` left unstaged | Passed | commit `ddd94ba9` | No generated artifacts |
| R0-PERF-BASE | Normal performance gate user | Establish whether `origin/main` itself is slow on this machine | scoped baseline probes + isolated `ca1dc9c0` / `54de2faf` gates | Baseline samples near accepted range or failure becomes reproducible on main | Main and old commits failed under some server states | Passed | `main-baseline-1.json`, `main-baseline-2.json`, isolated gate reports | Keep `.runtime` local |
| R0-PERF-652 | Regression reviewer | Check whether `codex/render-recovery-review-fix` adds startup cost | fresh `npm run perf:gate` after clearing stale review-fix active server | Review-fix delta is isolated or exonerated | `652d0354` passed: TNO `5215.8ms`, HOI4 `5659.4ms`, `failures=[]` | Passed | review-fix `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json` | Keep `.runtime` local |
| R0-MISLEAD | Misleading success output | Verify perf commands by exit code and recorded JSON, not success-looking text | command exit + `.runtime/output/perf/...` | Non-zero exit blocks merge | Stale `active_server.json` made one 652 sample measure the main server; script now rejects dead-pid metadata | Passed | `tools/perf/run_baseline.mjs`, `tests/test_perf_gate_contract.py` | Stale review-fix active server removed |
| R1-VISUAL | End user seeing color loss | Browser-visible color after zoom/shrink must be checked before claiming color bug fixed | future pixel/visual smoke | Color sampled or screenshot-backed evidence | Pending R1 | Pending | Pending |

## Stop Rule
- Stop R0 merge work after three same-shape perf failures or a confirmed code regression.
- Continue to R1 only after R0 merge state is clean.
