# Render Data Chain Split Plan 2026-06-15

## Goal

完成渲染链拆分和数据链 table-driving 收口，保持现有输出合同稳定，并在独立 worktree 内完成验证、review、QA、整合交付。

## Constraints

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-data-chain-split-20260615`
- Branch: `codex/render-data-chain-split-20260615`
- Base: `origin/main` at `26ae7677`
- Live test/build owner: main Codex agent
- Child agents: static inspection/review only
- Source and `dist/app` mirror must remain in sync when browser-delivered JS changes.

## Acceptance Criteria

- Data chain:
  - `tests/test_global_transport_builder_contracts.py` protects byte-stable golden outputs for the China OSM GPKG families.
  - OSM GPKG road, rail, industrial, and logistics families are driven by a shared registry shape.
  - Dead OSM PBF road/rail pack builders are removed.
  - Geometry contracts are explicit: road line, rail line, logistics point, industrial output point with polygon-or-point capability.
- Render chain:
  - Point preview loader state and async load functions live outside the controller.
  - Point preview DOM node/marker/label helpers live outside the controller.
  - Industrial preview reuses a loader split while preserving polygon/point projection logic.
  - Rail and road use the existing line runtime as loader/runtime and only move DOM/render helpers where useful.
- Verification:
  - `python -m unittest tests.test_global_transport_builder_contracts -q`
  - `python -m py_compile map_builder/transport_family_registry.py tools/build_transport_country_real_packs.py`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-overview-line-contract`
  - `npm run verify:test-import-graph`
  - `node tools/select_verification_targets.mjs <changed files> --json` and selected targets
  - `npm run verify:pages-dist` if source/dist delivery surface changes
  - `git diff --check`

## Work Plan

1. [done] Establish worktree, docs, registry, and inspect current implementation.
2. [done] Implement Workstream B: golden tests, registry, OSM GPKG driver migration, dead code removal.
3. [done] Implement Workstream A: point loader, point DOM helpers, industrial loader, line DOM helpers as needed.
4. [done] Run targeted verification and update source/dist mirrors.
5. [in-progress] Run ai-slop-cleaner bounded to changed files, review self-check, and UltraQA scenario matrix.
6. [pending] Commit branch, merge to main, push, update registry, and clean the temporary worktree when safe.

## Cleanup Plan

- Keep cleanup scoped to changed files.
- First protect behavior with targeted tests.
- Remove dead OSM PBF builders as the primary dead-code pass.
- Avoid new dependencies and broad wrapper layers.
- Classify fallback-like code found in touched files before editing.
