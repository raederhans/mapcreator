# Worktree Registry

Last updated: 2026-06-16

## Integration Owner

- Owner: main Codex agent in `C:\Users\raede\Desktop\dev\mapcreator`
- Integration branch: `main` closeout
- Base: `main` is aligned with `origin/main`
- Live test/build owner: main Codex agent only
- Subagents: static inspection/review only; no live tests, dev server, or browser processes delegated

## Recommended Order

1. `codex/renderer-modern-lights-owner` is already covered by `origin/main` through the renderer owner integration and postmerge review commits.
2. `codex/render-chain-cleanup-city-lights` is the only render branch still ahead of `origin/main`; integrate it from the clean temporary worktree and push after validation.
3. Preserve the parent `main` checkout's unrelated archive WIP when refreshing local state.
4. Re-check recovery commit hashes before recreating any historical worktree.
5. Treat `origin/codex/tno-toponym-zh-audit` as a separate remote-only branch review, outside this local-branch cleanup pass.

## Current Worktrees

| Worktree | Branch / HEAD | Base | Status | Dirty / hot files | Evidence | Overlap risk | Integration action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| none | both render branches covered by main closeout | `origin/main` `bb40fe02` | integrated | no active render worktree should remain after push cleanup; parent checkout still has unrelated `docs/archive/data-architecture-hardening-v2/context.md` WIP | CITY LIGHTS FINAL PASS: node checks, owner behavior 9/9, render-cache and urban policy contracts 6/6, city e2e 8/8, layer smoke 4/4, Pages dist build/startup/landing showcase, diff check. PERF CAVEAT: historical perf gate failed for current branch and same-machine `origin/main`. | Green | Push closeout to `main`, then remove temporary integration worktree |

## Current Overlap Matrix

| Pair | Risk | Reason |
| --- | --- | --- |
| `codex/renderer-modern-lights-owner` vs `origin/main` | Green | `origin/main` already contains `ace6bc34` and its postmerge review fixes; `git diff --name-status origin/main...codex/renderer-modern-lights-owner` is empty. |
| `codex/render-chain-cleanup-city-lights` vs current `origin/main` | Yellow | The branch touches shared renderer files, `dist/app`, `package.json`, and e2e smoke tests; it fast-forwards cleanly because it starts from current `origin/main`. |
| parent main checkout vs render integration worktree | Yellow | Parent checkout has unrelated archive WIP; integration stays in the clean temporary worktree and pushes by ref. |

## Recovery Records

These rows are branch or commit recovery indexes. They are historical references, not current worktrees.

| Former worktree | Recovery ref | HEAD commit | Removed at | Archived docs | Reopen condition |
| --- | --- | --- | --- | --- | --- |
| `C:\Users\raede\.codex\worktrees\mapcreator-render-chain-cleanup-city-lights` | branch `codex/render-chain-cleanup-city-lights`; main closeout branch `codex/render-main-integration-20260616` | `31c7be26` plus registry closeout commit | cleanup after main push | `docs/archive/render-chain-cleanup-city-lights-20260616/` | Inspect this branch/docs when auditing City Lights owner extraction, historical 1930 night lights, or layer smoke stale-contract repairs. |
| `C:\Users\raede\.codex\worktrees\mapcreator-city-lights-baseline` | detached `origin/main@bb40fe02` | `bb40fe02` | cleanup after push | none; comparison-only worktree | Used only for same-machine perf/layer-smoke baseline checks; remove after final closeout. |
| `C:\Users\raede\.codex\worktrees\mapcreator-renderer-review-fixes` | `origin/main` after renderer owner postmerge review fix / former branch `codex/renderer-review-fixes` | `60f13301` | 2026-06-16 | `docs/archive/renderer-owner-postmerge-review-20260616/` | Inspect this commit/docs when auditing renderer owner intensity channel tolerance or modern city lights render-cache contract location. |
| `C:\Users\raede\.codex\worktrees\mapcreator-transport-render-data-closeout` | `origin/main` after transport closeout push / former branch `refactor/transport-render-data-closeout` | `106c83c2` | 2026-06-16 | `docs/archive/transport-render-data-closeout-20260616/` | Inspect this commit and archive docs when auditing preview splits, dist drift guards, smoke profile schema, or OSM-GPKG builder registry changes. |
| `C:\Users\raede\Desktop\dev\mapcreator` | `origin/main` after renderer owner integration / branch `codex/renderer-modern-lights-owner` | `ace6bc34` | 2026-06-16 | `docs/archive/renderer-modern-lights-owner-20260616/` | Inspect this commit and archive docs when auditing map renderer owner splits for Modern City Lights, Rivers, Ocean, Physical, or Scenario relief overlays. |
| `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615` | `main` / former branch `codex/localization-governance-20260615` | `4711b0dd` | 2026-06-15 | `docs/archive/localization-governance-20260615/` | Inspect `4711b0dd` and archived docs when auditing localization governance ownership changes. |
| `C:\Users\raede\Desktop\dev\mapcreator-a11y-home-app-fix-20260615` | commit `55f143de` | `55f143de` | 2026-06-15 | `docs/archive/a11y-home-app-fix-20260615/` | Inspect commit/docs when auditing homepage and app-page accessibility fixes. |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260615-registry-closeout` | `origin/main` | `691c933f` | 2026-06-15 | `docs/archive/housekeeping-review-fix-20260615/` | Inspect `691c933f` when auditing this automation's registry correction. |
| `C:\Users\raede\Desktop\dev\mapcreator-housekeeping-review-fix-20260615` | commit `64ae29be` | `64ae29be` | 2026-06-15 | `docs/archive/housekeeping-review-fix-20260615/` | Inspect commit/docs when auditing this registry review fix. |
| `C:\Users\raede\Desktop\dev\mapcreator-worktree-housekeeping-20260615` | commit `c076d5e5` | `c076d5e5` | 2026-06-15 | `docs/archive/worktree-housekeeping-20260615/` | Inspect commit/docs when auditing cleanup history. |
| `C:\Users\raede\Desktop\dev\mapcreator-e2e-route-contract-repair-20260615` | commit `f4d16b20` | `f4d16b20` | 2026-06-15 | `docs/archive/e2e-route-contract-repair-20260615/` | Inspect commit/docs when auditing E2E route contract repairs. |
| `C:\Users\raede\Desktop\dev\mapcreator-render-data-chain-split-20260615` | commit `b8727d42` | `b8727d42` | 2026-06-15 | `docs/archive/render-data-chain-split-20260615/` | Inspect commit/docs when auditing render/data split work. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phase2-3-deepening-2026-06-14` | commit `b1db07b1` | `b1db07b1` | earlier cleanup | prior active/docs history | Inspect commit when recovering phase 2/3 transport deepening details. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-integration-2026-06-14` | commit `77d18776` | `77d18776` | earlier cleanup | prior active/docs history | Inspect commit when recovering data-chain integration decisions. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase1` | commit `d7125716` | `d7125716` | 2026-06-16 | `docs/archive/tooling-simplification-phase1/` | Main already covered this branch during cherry-pick; inspect commit/docs only when recovering old tooling validation details. |
| `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup-phases` | commit `85621443` | `85621443` | 2026-06-16 | prior active/docs history | Covered by later render-chain phase 4/5 and current main runtime helpers; inspect commit only for old line preview helper history. |
| `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup` | commit `8e89262e` | `8e89262e` | 2026-06-16 | `docs/archive/render-chain-cleanup-phase4-5/` | Missing spatial/chunk helper work was integrated; inspect commit/docs when auditing render helper extraction. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-quality-repair-2026-06-14` | commit `b856ceca` | `b856ceca` | 2026-06-16 | `docs/archive/data-quality-repair-2026-06-14/` | Main already contains the nested water geometry coordinate guard; inspect commit/docs only for old data repair context. |
| `C:\Users\raede\Desktop\dev\mapcreator-data-chain-phases-2-4` | commit `d858d276` | `d858d276` | 2026-06-16 | `docs/archive/data-chain-phases-2-4/` | Main already contains the helper boundaries with newer runtime updates; inspect commit/docs only for old phase 2-4 context. |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260612-appearance-transport` | commit `01811500` | `01811500` | 2026-06-16 | prior active/docs history | Main already contains the appearance preset intensity revision repair; inspect commit only for old audit context. |
| `C:\Users\raede\Desktop\dev\mapcreator-audit-20260610-20260610-113750` | commit `cf2a57a1` | `cf2a57a1` | 2026-06-15 | prior active/docs history | Inspect commit when recovering old audit preservation details. |
| `C:\Users\raede\Desktop\dev\mapcreator-hoi4-strategic-values` | commit `979b20de` | `979b20de` | 2026-06-15 | prior active/docs history | Inspect commit when recovering HOI4 strategic values details. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2` | commit `9a5febfe` | `9a5febfe` | earlier cleanup | prior active/docs history | Inspect commit when recovering tooling phase 2 details. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase3` | commit `e296e660` | `e296e660` | earlier cleanup | prior active/docs history | Inspect commit when recovering tooling phase 3 details. |
| `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase4a` | commit `16360a6f` | `16360a6f` | earlier cleanup | prior active/docs history | Inspect commit when recovering tooling phase 4A details. |

## Active Notes

- Parent main checkout had unrelated local WIP in `docs/archive/data-architecture-hardening-v2/context.md`; renderer integration used a clean temporary worktree to preserve that local file.
- Main Codex agent owns validation commands; child agents are read-only static reviewers.
- Historical delivery packages live in their archived task/context docs; active registry keeps current worktree rows and recovery indexes.
- 2026-06-15: `codex/housekeeping-review-fix-20260615` was merged, archived, and cleaned locally. Commit `64ae29be` remains as the recovery record.
- 2026-06-15 localization governance: `4711b0dd` was fast-forward merged into main, validated on main, archived, pushed through the registry closeout, and cleaned from the active worktree list.
- 2026-06-15 a11y home/app fix: `55f143de` was rebased onto current main, validated with i18n, behavior, Pages dist, and a11y scan gates, fast-forwarded into main, and archived for cleanup.
- 2026-06-16 worktree cleanup: removed two unregistered local directory remnants with no `.git`: `C:\Users\raede\Desktop\dev\mapcreator-hgo-review-fix` and `C:\Users\raede\Desktop\dev\mapcreator-ocean-scotia-source-refinement-2026-06-02`. Recovery docs remain under `docs/archive/`.
- 2026-06-16 branch cleanup: deleted all local branches merged into `main` and all remote `origin/codex`, `origin/audit`, and `origin/backup` branches merged into `main`; recovery rows now use commit hashes for deleted branch refs.
- 2026-06-16 residual branch cleanup: deleted stale residual branches, backup branches, and open-PR head branches requested for cleanup. GitHub API close attempts for PRs #45, #73, #85, and #86 returned 401, then deleting the head branches removed them from the open PR list.
- 2026-06-16 remaining local branch pass: `codex/tooling-simplification-phase1` was covered by current main; `codex/render-chain-cleanup-phase4-5` contributed only the missing spatial query and scenario chunk promotion helper work; `codex/render-chain-cleanup-phases` was its covered ancestor.
- 2026-06-16 remaining local branch pass: `codex/data-chain-phases-2-4`, `codex/data-quality-repair-2026-06-14`, and `codex/audit-20260612-appearance-transport` were classified as covered or stale after direct helper/test checks; their branch refs can be recreated from the commit hashes above.
- 2026-06-16 transport render/data closeout: isolated worktree `C:\Users\raede\.codex\worktrees\mapcreator-transport-render-data-closeout` was used because the parent main checkout had unrelated dirty localization WIP. Main Codex agent owned live builds/tests; subagents stayed in static/review lanes.
- 2026-06-16 transport render/data closeout: WS3 dist drift guard, WS2 jsonschema smoke profile validator, and WS1 OSM-GPKG family driver were implemented, audited, verified, archived, and pushed to `origin/main` at `106c83c2`.
- 2026-06-16 pre-renderer-owner note: before switching this checkout to `codex/renderer-modern-lights-owner`, the same path had local `main` dirt and unrelated WIP; preserve that context during integration, but keep Current Worktrees limited to the actual branch checked out at this path.
- 2026-06-16 renderer owner integration: `codex/renderer-modern-lights-owner` was fast-forward merged in `C:\Users\raede\.codex\worktrees\mapcreator-renderer-main-integration`, validated with Pages dist and renderer targeted gates, archived under `docs/archive/renderer-modern-lights-owner-20260616/`, and prepared for `origin/main` push.
- 2026-06-16 renderer owner postmerge review: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-review-fixes` reviewed `origin/main@6e818068`, fixed missing intensity channel tolerance in modern city lights and physical owners, refreshed `dist/app`, repointed the render-cache contract to the owner module, and archived under `docs/archive/renderer-owner-postmerge-review-20260616/`.
- 2026-06-16 render branch sync: `codex/renderer-modern-lights-owner` is already covered by `origin/main`; `codex/render-chain-cleanup-city-lights` was fast-forwarded into `codex/render-main-integration-20260616`, validated, and prepared for `main` push.
