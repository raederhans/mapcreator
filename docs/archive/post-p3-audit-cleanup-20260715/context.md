# Post-P3 Audit and Repository Cleanup Context

## Starting truth

- Starting remote main: `f8ef7a4cb7caaf99dedb1dcf6ee9bffa1691192a`.
- Dirty parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` at `db8bd6c1`. The final preservation inventory found 87 WIP paths; the earlier 57-path count was stale.
- Clean integration worktree: `C:\Users\raede\.codex\worktrees\mapcreator-post-p3-audit-cleanup-20260715`.
- Preserved audit worktree: `C:\Users\raede\.codex\worktrees\mapcreator-audit-20260715-p3-closeout` at `cb829a6d`.

## Audit findings

1. Current main allowed missing schema-2 canonical performance identity fields to pass comparison through conditional checks or legacy fallbacks.
2. Current main's shared `waitForChunkIdle()` omitted `pendingInfraPromotion`, merging the focused visual-readiness boundary into the broader interaction-idle boundary.
3. Audit-only docs commits are superseded by the archived P3 closeout; their runtime-independent content does not require replay.

## Curated recovery

- `4eab36c`: canonical schema-2 platform, nodeMajor, browser, runs, warmups, and scenarios fail closed with focused tests.
- `efec5f62`: shared interaction idle again waits for deferred infra while the focused political color helper keeps visual readiness semantics.
- `460c4a36`: browser, browser version, package-lock, query, and scenario identity reject current-only and bilateral missing values.
- `1bceb091`: required scenario manifest hashes and feature counts reject baseline-only and bilateral missing values.
- `c6ad52cb`: scenario manifest and feature-count regressions now prove baseline-only, current-only, and bilateral missing paths independently.
- `7b56e50b`: standard gate identity projects the ordered current gate scenarios through the baseline, preserving baseline-only observation samples while rejecting missing, duplicate, and reordered gate sets.
- `47dc076e`: shared city fixtures keep strict infrastructure-idle semantics by default while two pixel-only suites can explicitly wait for visual readiness.
- `18d6ffae`: every city-lights visual settle uses one suite-local visual-idle helper, with a structural contract that rejects future direct strict waits in the three affected helpers.

## Review result

- Independent code review: APPROVE after the current-only scenario workload regression was added.
- Independent architecture review: CLEAR after gate-vs-observation tests covered missing, reordered, current-duplicate, and baseline-duplicate scenario sets.
- P3 runtime owners, render-pass order, public facade, RendererRuntimeContext, and state-write allowlist stayed unchanged.

## Validation evidence

- Focused role-governance suite: 42/42.
- Performance contract suite: 23/23.
- `verify:core` at exact functional HEAD `7b56e50b`: 76/76.
- `verify:core:main-thread` at exact functional HEAD `7b56e50b`: 80/80; project save/load 5/5; interaction funnel 3/3.
- Scenario chunk runtime at `c6ad52cb`: 8/8.
- Standard `perf:gate` at `7b56e50b`: exit 0, contract mismatches 0, render-role mismatches 0, regressions 0.
- The first `perf:gate` attempt exposed the valid baseline observation superset and was retained as root-cause evidence. The controlled rerun followed the tested contract correction.
- Structural E2E tooling at final functional HEAD `18d6ffae`: 36/36.
- Focused city label and city lights suites: 1/1 each.
- City rendering matrix at `18d6ffae`: 8/8.
- Strict scenario chunk runtime at `18d6ffae`: 8/8.
- Final `verify:core` at `18d6ffae`: 76/76.
- Final `verify:core:main-thread` at `18d6ffae`: 80/80; smoke 4/4, scenario concurrency 1/1, project save/load 5/5, interaction funnel 3/3.
- Final Pages build and dist drift: 927.20 MiB, exit 0.

## Preservation and cleanup

- Parent WIP recovery commit: `549cd350dcc565b7c4343e764f96da3050b991d4` on local and remote `codex/parent-wip-recovery-20260715`.
- Binary backup: `.runtime/cleanup-backups/parent-wip-20260715.patch`, 148080 bytes, SHA256 `00b2734f7bcf58ff67773333ad02dbd6c03a66f617ee85d4f2d1f543fe302a7d`.
- Parent `main` was restored, fast-forwarded, and left tracked-clean at the final functional baseline.
- Integrated or patch-equivalent P0/P1/P2/P3/perf/readiness branches were deleted locally; matching obsolete remote branches were deleted and pruned.
- Both completed audit worktrees and their junction-safe physical residues were removed.
- Unique HGO, WGI, TNO, Williams, stale-parent, parent-WIP, and recovery refs remain preserved for separate review.

## Live-process ownership

- Owner: none; all shared-resource validation lanes are released.
- Workdir: `C:\Users\raede\.codex\worktrees\mapcreator-post-p3-audit-cleanup-20260715`.
- Serial shared-resource commands: `verify:core`, `verify:pages-dist`, `verify:dist-drift`, selected Playwright lanes, and `perf:gate`.
- Shared resources: localhost test servers, Chromium, `.runtime` reports/logs, dist output, Node cache.
- Logs: `.runtime/logs/post-p3-audit-cleanup-20260715/`.
- Success: exit 0, zero route gaps, clean tracked status after generated-output checks.
- Stop: preserve first failure and diagnose before retry; three identical failures under one hypothesis end retries.
