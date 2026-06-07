# HGO Preview Layer Plan

## Goal

Make the HGO developer preview participate in the normal renderer lifecycle so redraw, restore, hover, and click all use the same HGO raster overlay state.

## Scope

- Keep HGO runtime preview developer-gated.
- Keep HGO raster color, seed, owner/controller, and viewport math unchanged.
- Add the smallest renderer lifecycle bridge needed for post-draw HGO overlay repaint and inspect routing.
- Preserve default scenario rendering when HGO preview is disabled.

## Steps

- [x] Create isolated worktree from latest `origin/main`.
- [x] Read project lessons and identify HGO lifecycle contract.
- [x] Map current HGO preview controller and map renderer interaction paths.
- [x] Implement post-draw HGO repaint and overlay inspect bridge.
- [x] Add focused regression tests for redraw persistence, restore, and inspect priority.
- [x] Run UltraQA scenario matrix and required verification commands.
- [x] Review for simpler implementation and archive this task folder.

## UltraQA Scenario Matrix

| ID | Scenario | Expected Signal |
| --- | --- | --- |
| UQA-HGO-001 | Normal enable, map redraw, HGO overlay repaint | Passed: HGO render count increased and preview remained READY |
| UQA-HGO-002 | Disable preview after owning overlay | Passed: restore callback ran and HGO inspect returned null |
| UQA-HGO-003 | Inspect inside HGO viewport before normal map hit | Passed: HGO hit returned with viewport metadata |
| UQA-HGO-004 | Inspect outside HGO viewport | Passed: HGO inspect returned null and cleared inspect result |
| UQA-HGO-005 | Stale async load after disable/dispose | Passed: stale loader did not write READY state |
| UQA-HGO-006 | Missing loader/config in developer mode | Passed: persisted enable cleared to unavailable without throwing |
| UQA-HGO-007 | Repeated redraw calls | Passed: repeated redraw updated render count without loop |
| UQA-HGO-008 | Dirty parent checkout isolation | Passed: work ran in isolated clean worktree |
