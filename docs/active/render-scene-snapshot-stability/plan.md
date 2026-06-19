# Render Scene Snapshot Stability Plan

Base branch: `main`
Base commit: `8c13c395b9704cb8c380d4aa8c0f05e302326074`
Execution branch: `codex/render-scene-snapshot-stability`
Started: 2026-06-19

## Intent

Stabilize scenario political rendering by giving visible frames, worker bitmaps, pass caches, deferred full cache, and interaction composites one shared scene snapshot identity. After that, tighten progressive/coarse frame eligibility and make political feature color writes use one explicit override transaction. Water-region painting stays on its existing `waterRegionOverrides` channel because it is a separate visual domain.

## Acceptance Criteria

- Current scenario cannot visibly commit an old-scenario or coarse-only political frame as a trusted political layer.
- Partial political repaint only runs on a fine, same-scene political baseline.
- Worker bitmap and deferred full cache results are latest-wins by scene snapshot.
- Political feature color edits use one write transaction for visual and feature overrides.
- Water-region color edits remain isolated to `waterRegionOverrides` and keep their existing water/ocean invalidation path.
- Full visual collection remains the color authority when `landDataFull` exists.
- Targeted Node/Python contracts, syntax checks, `verify:pages-dist`, and final diff checks pass.

## Execution Phases

1. Add scene snapshot state and diagnostics to runtime state, visible frame identity, last-good frame, interaction composite, worker identity, deferred full cache, and promotion metrics.
2. Split coarse prewarm cache readiness from trusted visible commit readiness.
3. Gate progressive underlay, full political reference, and partial repaint on same-scene fine political readiness.
4. Add a single feature visual override write transaction and document the separate water-region override boundary.
5. Add targeted contract tests and run the validation ladder.
6. Review for simpler implementation, update lessons only for durable new lessons, commit, push, and prepare integration closeout.

## Live Process Ownership

Main Codex agent owns all builds, tests, browser checks, and long-running processes. Subagents may perform static analysis and review only.
