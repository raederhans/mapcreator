# Phase 2C Plan: Post-Edit Draw/Probe Determinism

## Classification

- Level: complex.
- Live process owner: main Codex agent only.
- Static subagents: code-mapper, test-engineer, architect. They may inspect code and report findings; they must not run or monitor e2e/dev-server/build processes.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-phase2c-post-edit-determinism-20260623`.
- Branch: `codex/phase2c-post-edit-determinism-20260623`.
- Base: `origin/main@75ffdaa7100d9c371d5a2fe2b75d3a3408603029`.

## Bounds

- Do not modify Thematic, Appearance, or Map Content UI.
- Do not repair 1936/1939 Red Sea in this phase.
- Do not touch the parent checkout WIP paths named in the user request.
- Do not pass by loosening pixel thresholds, skipping `FR_ARR_18002`, hardcoding `#ff00aa`, or deleting tests.
- First decide whether the failure is a probe/wait problem or a production draw/cache problem.

## Working Plan

1. Reproduce the single failing grep on current `origin/main` and collect artifact paths.
2. Add focused diagnostics for four points: before edit, after `refreshResolvedColorsForFeatures`, after `refreshMapDataForScenarioChunkPromotion`, and after stable render wait.
3. Add a temporary or permanent wait probe that requires a post-edit political pass commit for the target `colorRevision`, then classify wait/probe versus production draw/cache.
4. Implement the smallest production or test-helper fix that keeps post-edit first-pixel performance and chunk-promotion behavior.
5. Extend an existing lower-level test where possible and keep the browser failure diagnostics useful.
6. Run focused grep, full scenario chunk runtime, requested Node/Python gates, Pages dist only if production/dist changes require it, `git diff --check`, and final independent review.

## UltraQA Scenario Matrix

| ID | Intent | Setup | Command or harness | Expected signal | Status |
| --- | --- | --- | --- | --- | --- |
| BASE-001 | Reproduce current failure | Current `origin/main`, single grep then full route | Playwright single grep and full scenario route | Single grep passed on current main; full route reproduced 7/8 with blue sample | done |
| DIAG-001 | Capture four post-edit snapshots | Instrument failing path | Full route and focused grep | Snapshots include state, cache, pass, last-good-frame, and main-canvas sample fields | done |
| WAIT-001 | Decide wait/probe branch | Added targeted stable wait | Full route | Wait alone exposed a still-dirty `rebuild-colors` progressive skip state | done |
| DRAW-001 | Decide production draw/cache branch | Kept stricter wait and inspected draw/cache signals | Full route | Classified as production draw/cache bug | done |
| REG-001 | Lower-level regression | Existing Node contract extended | `npm run test:node:scenario-chunk-contracts` | Post-edit visual override survives chunk promotion after pending edit clears | done |
| E2E-001 | User-visible behavior | Final focused grep | Playwright single grep | `FR_ARR_18002` samples near resolved color | done |
| E2E-002 | Full runtime suite | Final full route | `npm run test:e2e:dev:scenario-chunk-runtime` | 8/8 pass | done |
| GUARD-001 | Preserve Phase 1/2A | Requested Node/Python/Page-dist gates | Package scripts and unittest | Existing stability and owner coverage remain green | done |
