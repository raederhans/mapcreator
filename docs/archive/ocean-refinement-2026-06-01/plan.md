# Ocean Refinement Plan - 2026-06-01

## Goal

Fix and verify three ocean issues:
- Hover outline looks rough on refined ocean polygons.
- Some ocean geometry remains under-refined or overlapping, with Arctic waters as the first suspected area.
- Ocean hover/selection highlight can remain visible after the pointer moves away.

Then continue the ocean refinement project at global scope using current refined water work as the baseline.

## Execution Rules

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-refinement-20260601`
- Branch: `codex/ocean-refinement-20260601`
- Live process owner: main agent only.
- Browser owner: main agent only.
- Subagents may do static analysis and read completed logs only.
- Shared source/dist surfaces must be integrated serially.

## Plan

1. Map the rendering and selection lifecycle for ocean hover/highlight.
2. Map current water data truth sources, derived outputs, chunks, and validators.
3. Gather minimal upstream rendering/geospatial practice evidence.
4. Patch the smallest owner-level rendering/state issue first.
5. Add or extend targeted tests for the behavior contract.
6. Run water geometry validators and identify concrete refinement gaps.
7. Patch global water refinement data only where evidence proves a bad geometry or overlap.
8. Sync checked-in delivery artifacts when source/dist parity requires it.
9. Run targeted tests, data validation, source/dist gate, and review self-check.
10. Merge to `main`, commit with Lore trailers, push, and remove the temporary worktree.

