# Appearance + Transport Platformization Context

## 2026-06-11 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-appearance-transport-platformization`
- Branch: `codex/appearance-transport-platformization`
- Base: `origin/main` at `59e9ae87`
- Parent checkout is dirty and behind remote, so all edits stay in this isolated worktree.
- Main thread owns live tests, browser checks, dev servers, builders, and final shared-file integration.
- `node_modules` is missing in this worktree; install dependencies before running npm scripts.
- `npm ci` completed successfully; dependency baseline is ready for targeted tests.

## Evidence

- Day/Night renderer already contains UTC clock logic; state normalization and UI force manual mode.
- Transport defaults have a registry source of truth; controller still contains family-specific inline defaults.
- Physical owner and physical layer tests exist and should be extended.
- New intensity field state must be connected before UI writes to it, so save/load/history contracts come before panel controls.
- Baseline pass: `test:node:appearance-texture-owner`, `test:node:transport-appearance-controller`, `test:node:appearance-city-points-owner`, `test:node:appearance-parent-border-owner`, and `test:node:physical-layer-contracts`.
- Baseline gap: `verify:state-write-allowlist` fails on current `origin/main` with unrelated unexpected direct state write files and one stale allowlist entry.
- Audit package A completed: texture input binding/history capture, city-points binding consolidation, and transport registry default rendering/fallbacks. Targeted tests pass for texture owner, city-points owner, and transport appearance controller.
- Day/Night package B completed: state normalization preserves `utc` and `cycle`, UI exposes clock mode and cycle speed, renderer timer refreshes `utc` and `cycle`, and texture owner tests pass.
- Physical intensity package C completed as a unified framework: `intensityFields` owns baked Float32 grid channels, `physicalAtlas` and `physicalContour` are serializable channels, and legacy `physicalIntensityField` remains as the Physical panel weighted-point bridge for this pilot.
- Physical renderer integration completed: `physicalAtlas` samples modulate atlas alpha, `physicalContour` samples modulate contour alpha, and render signatures include channel revisions.
- Physical panel editing completed: enable/clear and weighted center points continue to update the point bridge, while `Stamp Center Brush` paints the unified grid channel and enters history as an intensity-field patch.
- C package verification passed: `npm run test:node:appearance-physical-owner`, `node --test tests/intensity_field.node.test.mjs`, `npm run test:node:physical-layer-contracts`, `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`, and `python tests/test_history_manager_strategic_overlay_contract.py`.
- UltraQA verification passed: targeted appearance/transport tests, syntax checks, `verify:state-write-allowlist`, fresh-server `test:e2e:physical-layer-regression`, `verify:pages-dist`, and `git diff --check`.
- Physical e2e needed two test-contract fixes: expected anonymous Cloud Saves `/api/backend/auth/me` 401 probes use the existing project filter pattern, and the visual assertion now combines renderer draw-count diagnostics with a stable full-canvas diff threshold.
- Final reviewer found and main thread fixed four blocking issues: zero-strength grid cells now serialize as zero, history records `intensityFieldChannels` and replays only touched channels, Stamp Center Brush syncs legacy enabled/UI state without clobbering draft sliders, and Clear resets `physicalAtlas.grid.base` to neutral.
- Final blocker-fix verification passed: `node --test tests/intensity_field.node.test.mjs`, `npm run test:node:appearance-physical-owner`, `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`, `python tests/test_history_manager_strategic_overlay_contract.py`, `npm run verify:pages-dist`, `PLAYWRIGHT_REUSE_EXISTING_SERVER=0 npm run test:e2e:physical-layer-regression`, `npm run verify:state-write-allowlist`, syntax checks, and `git diff --check`.
