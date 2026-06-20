# Render Transaction Stability Plan

## Goal

Fix the shared render-transaction identity chain behind render jumps, disappearing country fills, brief black frames after fill edits, and intermittent Atlantropa donor-state loading.

## Acceptance Criteria

- Political raster worker results preserve `sceneGeneration` and `scenarioDataGeneration` end to end.
- Optional scenario layer commits that change visible render data bump `scenarioDataGeneration` exactly once per committed batch.
- `scenario_atlantropa` changes share the same data-generation transaction as political/water visible data.
- A failed exact or fast frame after the first visible frame preserves continuity without recording an old identity as a new committed frame.
- HGO preview and interaction composite paths cannot clear or reuse stale pixels across a pending render-data transaction.
- Targeted Node/Python contracts, focused political progressive recovery E2E, architecture/import gates, and Pages dist verification pass.

## Execution Steps

- Stage 1: Fix worker identity roundtrip and add direct worker/client coverage.
- Stage 2: Fix optional/Atlantropa generation commit semantics and add chunk refresh contracts.
- Stage 3: Fix visible-frame continuity boundaries and add fallback/metric contracts.
- Stage 4: Fix amplification paths in interaction composite continuity and HGO preview fast frame.
- Stage 5: Run targeted verification, review, update registry delivery package, merge, push, and clean worktree.

## Constraints

- Keep current Canvas renderer structure; no renderer rewrite or new dependency.
- Do not add generic fallback, retry, or degrade layers.
- `scenarioDataGeneration` represents committed visible render-data semantics, not viewport movement or ordinary repaint.
- Main checkout has unrelated `data/locales.json` work; all edits stay in this worktree.
- Main Codex agent owns all live tests and Pages dist commands; child agents are static/review lanes only.
