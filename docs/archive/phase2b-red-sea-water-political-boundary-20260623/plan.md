# Phase 2B Red Sea / Water-Political Boundary Plan

## Classification

- Task level: complex + integration.
- Base: `origin/main@bad30a8d7b32ec7f91963538b318b73e3f14d621`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-phase2b-red-sea-water-political-20260623`.
- Branch: `codex/phase2b-red-sea-water-political-20260623`.

## Boundaries

- Handle only `hoi4_1936` and `hoi4_1939` Red Sea / ocean color and water hit behavior.
- Keep Thematic, Appearance, Map Content UI, and parent checkout UI/palette WIP untouched.
- Keep TNO post-edit draw/cache lane untouched except for targeted regression verification.
- Keep the 1936/1939 SOV backfill for real RU land fallback.

## Plan

1. B0 diagnose before production edits. Completed.
   - Reproduce 1936 and 1939 red water.
   - Record feature/color/owner/index/hit snapshots for sampled ocean points.
   - Classify the bug as backfill pollution, missing water guard, hit-index gap, geometry issue, or other.
2. B1 repair SOV backfill boundary. Completed.
   - Add a land-political predicate around `buildHoi4FarEastSovietOwnerBackfill`.
   - Exclude shell fallback, base geography, water/ocean helpers, and visual-only support geometry.
   - Prove normal RU land without explicit owner/controller still backfills to SOV.
3. B2 repair water/ocean color guard. Completed.
   - Add a reusable predicate for water/ocean/base-geography features.
   - Feed it into color resolution without classifying normal land or Atlantropa owner land as ocean.
4. B3 repair water selectability. Completed.
   - Confirm default open ocean interaction semantics.
   - Ensure open-ocean selection uses water targets and closed selection does not return political SOV shells.
5. Verification and closeout. Completed before archive.
   - Run focused Node/Python/E2E checks, TNO scenario chunk regression, `verify:pages-dist` when dist changes, and `git diff --check`.
   - Run final review and architecture-invariant audit.
   - Commit with Lore protocol, push to `origin/main`, update registry, archive docs, and clean the worktree.

## Live Process Ownership

- Main agent owns all dev server, Playwright, long test, Pages dist, and push operations.
- Subagents are read-only/static unless a later explicitly bounded task gives them disjoint write scope.

## Completion Note

- B0 classified the issue as a production boundary and hit-gate problem: Red Sea water data and final blue canvas paint were present, but water hit selection was blocked when the water overlay was hidden and only open-ocean selection was enabled.
- B1 keeps the HOI4 Far East SOV backfill for ordinary RU land, including shell-fallback land ids, while excluding water-like and base-geography helpers.
- B2 adds a shared water-like feature predicate and routes it into color resolution so generic water-political helpers resolve to ocean fill without swallowing Atlantropa owner-colored surfaces.
- B3 lets open-ocean selection drive water hits independently from the visible water overlay flag.
- The phase was verified with targeted Node, Python, E2E, TNO chunk runtime regression, Pages dist, and diff checks.
