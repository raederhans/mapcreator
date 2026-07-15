# Post-P3 Audit and Repository Cleanup Plan

## Objective

Review the integrated P3 renderer pass-family delivery, recover any verified audit-branch fixes, validate the exact current-main candidate, synchronize local and remote main safely, and remove only branches and worktrees whose content is integrated or patch-equivalent.

## Phases

1. Audit P3 runtime, verification, dist, and task-record changes with independent code and architecture lanes.
2. Compare the preserved P3 audit worktree with current `origin/main` and recover verified unique fixes.
3. Run focused regression checks, deterministic core, browser/main-thread, dist, and performance gates under one live-process owner.
4. Push the reviewed candidate to `origin/main`.
5. Move dirty parent WIP onto a dedicated local recovery branch, back it up as a binary patch, and fast-forward the local `main` ref.
6. Remove integrated or patch-equivalent recovery branches and completed worktrees; preserve genuinely unique work.
7. Reconcile the worktree registry and archive this task record.

## Acceptance

- Independent code and architecture review return no blocking finding.
- Schema-2 performance identity fails closed for missing canonical fields.
- Focused visual readiness and shared interaction-infrastructure idle keep separate predicates.
- `verify:core`, dist parity, selected browser lanes, and `perf:gate` pass on the exact candidate.
- `origin/main` and local `main` resolve to the same final commit.
- Parent WIP remains byte-preserved on a dedicated branch plus backup patch.
- Every removed branch is integrated or patch-equivalent; every unique branch has an explicit keep reason.
- Registry and live Git worktree truth agree.

## Boundaries

- Preserve user-authored parent WIP.
- Preserve unique HGO, WGI, TNO, Williams, recovery, and parent-WIP histories until a separate review proves coverage.
- Keep P3 runtime behavior, pass order, public facade, state-write allowlist, and RendererRuntimeContext contracts stable.
- Use standard schema-2 `perf:gate`; Williams crossover remains outside this cleanup.
