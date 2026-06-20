# Render Resource Authority Refactor Context

Last updated: 2026-06-20

## Current State

- Branch: `codex/render-resource-authority`
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-resource-authority`
- Base: `origin/main@7bbebfb4e9ec12c077aebdeb0ba883df719fe9a5`
- Main checkout at task start: clean `main@7bbebfb4e9ec12c077aebdeb0ba883df719fe9a5`
- Live process owner: main Codex agent
- Child agents: static mapping, static review, and test-shape review only

## Plan Source

The approved direction is option 2 with selective rewrite and early retirement when old contracts create avoidable complexity. The practical reading is:

- Convert the refresh chain to a resource authority contract first.
- Keep pass compatibility only at explicit edges.
- Prefer deleting overlapping contracts after tests prove callers are covered.
- Preserve HGO/TNO/transport behavior and existing public entry names.

## Execution Log

### 2026-06-20 Setup

- Created isolated worktree from `origin/main`.
- Created `.omx/ultragoal/goals.json` and `.omx/ultragoal/ledger.jsonl`.
- Activated `ultrawork` and `ultraqa` OMX state files for this task.
- Created Codex durable goal for the aggregate refactor.
- Started task docs and registry entry.

### 2026-06-20 Implementation

- Added `RESOURCE_PASS_MAP`, `getTargetPassesForResources`, and resource-first descriptor resolution in `scenario_refresh_plans.js`.
- Updated `createFrameGraphInvalidation` so explicit `targetResources` is authoritative, including the explicit empty-array case.
- Added first-frame resource allowlist helpers and connected `firstFrameOnly` plus `hgoPreviewDirty` through `scenario_renderer_bridge.js` and `chunk_runtime.js`.
- Added `createScenarioChunkPromotionDelta` and `assertPromotionDeltaPureValue` in `scenario_chunk_promotion_helpers.js`.
- Moved runtime execution to `resolveScenarioChunkPromotionRendererRefreshDescriptor`.
- Deferred `PromotionDelta` creation until pending infra state needs to store it.
- Updated TNO relief overlay contract to recognize the existing owner boundary in `scenario_relief_overlay_render_owner.js`.
- Re-materialized TNO coverage ledgers through `tools/check_scenario_contracts.py --strict --write-safe` after Pages dist surfaced source/metadata hash drift.

### 2026-06-20 Review Fixes

- Performance review found explicit empty `targetResources` could fall back to broad `["political", "borders", "labels"]` invalidation. Fixed by carrying `hasExplicitTargetResources` through the descriptor and skipping pass invalidation for explicit empty resources.
- Code review found dist helper drift after a late source helper change. Fixed by rerunning `verify:pages-dist`.
- Code review asked for `firstFrameOnly + hgoPreviewDirty` behavior coverage. Added focused plan assertions.
- Main self-review tightened pure-value validation so `NaN` and other non-finite numbers are rejected.

### 2026-06-20 Ready For Integration

- Current status: ready-for-integration from `codex/render-resource-authority`.
- Post-merge short gate recommendation: architecture boundaries, scenario refresh plans, scenario chunk contracts, Pages dist.
- Active live process: none.

## Live Process Ownership

- Current owner: main Codex agent.
- Active live process: none.
- Log path: none yet.
- Other agents may read completed command output and repo files only.

## Discovered Code Anchors

- `js/core/map_renderer/scenario_refresh_plans.js`: resource/pass descriptor authority, first-frame resource allowlist.
- `js/core/map_renderer/scenario_refresh_runtime.js`: leaf executor, descriptor consumption, visual and infra sequencing.
- `js/core/renderer/scenario_chunk_promotion_helpers.js`: pure delta and promotion metric helpers.
- `js/core/scenario/scenario_renderer_bridge.js`: scenario-facing refresh bridge.
- `js/core/scenario/chunk_runtime.js`: startup initial visual routing and pending promotion commit path.
- `tests/scenario_refresh_plans_behavior.test.mjs`: resource authority, first-frame, HGO dirty, runtime invalidation tests.
- `tests/scenario_chunk_contracts.test.mjs`: static guardrail for runtime descriptor and startup allowlist wiring.
