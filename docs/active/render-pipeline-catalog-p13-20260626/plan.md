# P13 Render Pipeline Catalog Extraction Plan

## Objective

Extract idle render pipeline pass definitions from `js/core/renderer/render_pipeline_passes.js` into a pure catalog while preserving pass order, draw callback mapping, exact-after-settle behavior, HGO preview visibility behavior, context reuse decisions, partial political repaint behavior, and requested-pass filtering.

## Constraints

- Base: `origin/main@0f07d9943dfec2b1245320160306e4d6dd3519f7`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-pipeline-catalog-p13-20260626`.
- Branch: `codex/render-pipeline-catalog-p13-20260626`.
- Do not edit `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.
- Keep live test/build ownership in the main agent. Subagents are static reviewers only.

## Checklist

- [x] Create clean isolated worktree from latest `origin/main`.
- [x] Read project rules, lessons learned, registry, and P13 attachment.
- [x] Add `js/core/renderer/render_pipeline_catalog.js` with `IDLE_RENDER_PASS_DEFINITIONS`.
- [x] Route `getIdleRenderPassDefinitions()` through the catalog while preserving missing draw-pass noop behavior.
- [x] Add catalog behavior tests for order, draw key mapping, and requested-pass filtering.
- [x] Update architecture and Python boundary contracts.
- [x] Run the full requested validation list.
- [x] Run review and first-principles self-check.
- [ ] Commit, push branch and main, archive docs, update registry, and clean the worktree.

## Current Risk Notes

- The main behavioral risk is pass order drift. The new test asserts the exact P13 order and proves owner draw functions call the matching `drawKey`.
- `RENDER_PASS_NAMES` remains the public/cache pass catalog; `IDLE_RENDER_PASS_DEFINITIONS` owns idle pipeline order.
- E2E validation used a temporary `node_modules` junction to the parent checkout and removed it after the smoke gates.
- Code review returned CLEAR. Architect rename/dist suggestions were resolved through the explicit P13 constraints.
