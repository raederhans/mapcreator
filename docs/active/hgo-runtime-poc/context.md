# HGO Runtime PoC Context

## 2026-06-05 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-runtime-poc`
- Branch: `codex/hgo-runtime-poc`
- Base commit: `ab09cdd1`
- Main worktree had unrelated dirty files before this task. This worktree isolates the implementation.
- Live process owner: main agent only.
- Subagents may perform static file lookup, test-design review, and final code review. They must not run or monitor live tests.

## Current Phase

Implement the first vertical slice:

1. HGO runtime seed builder.
2. Independent JavaScript runtime index.
3. Focused tests and named scripts.

## 2026-06-05 Implementation Notes

- Added `tools/build_hgo_runtime_seed.py`.
  - Reads `map/definition.csv`, `history/states`, `common/country_tags`, and `common/countries`.
  - Requires `map/provinces.bmp` to exist because future raster rendering depends on the same HGO source root.
  - Hard-fails duplicate province ids, duplicate RGB mappings, unknown state province ids, duplicate state ids, duplicate province ownership, and states with provinces but no owner.
  - Reuses the existing HOI4 state parser for `history` block ownership, dated overrides, core removal, and `controller -> owner` fallback.
  - Writes runtime output to `.runtime/hgo_runtime/seed.json` by default.
- Added `js/core/hgo_runtime_index.js`.
  - Pure JS index over the seed.
  - Resolves province by id, RGB, and hex.
  - Resolves state, country, owner tag, controller tag, and owner color from the seed.
  - Does not read or mutate global app state.
- Added named scripts:
  - `test:py:hgo-runtime-seed`
  - `test:node:hgo-runtime-index`
  - `verify:hgo-runtime-poc`

## Validation Evidence

- `npm run verify:hgo-runtime-poc`: passed.
  - Python seed builder tests: 11 passed.
  - Node runtime index tests: 8 passed.
  - `node --check js/core/hgo_runtime_index.js`: passed.
  - `python -m py_compile tools/build_hgo_runtime_seed.py`: passed.
- `git diff --check`: passed with only Git's package.json CRLF warning.

## Review Fixes

- Reviewer found two high severity issues before merge:
  - Shallow state parsing ignored HOI4 `history` block semantics and dated overrides.
  - Missing controller was exposed as an empty controller tag.
- Fixed by routing state ownership parsing through `scenario_builder.hoi4.parser.parse_state_file`, adding `--as-of-date`, and adding runtime/controller fallback tests.

## Merge

- Branch `codex/hgo-runtime-poc` was fast-forward merged into `main`.
- Existing dirty files in the original main worktree were unrelated and preserved.

## 2026-06-05 Preview Phase Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-runtime-preview`
- Branch: `codex/hgo-runtime-preview`
- Base commit: `40874cef`
- Main checkout still has unrelated dirty files; this worktree isolates the current implementation.
- Live process owner: main agent only.
- Current live process log: `.runtime/tests/hgo-runtime-poc-baseline.log`.
- Subagents:
  - `code-mapper`: read-only UI/renderer boundary mapping.
  - `qa-expert`: read-only acceptance and coverage review.
- Current phase target: real HGO source smoke, independent raster renderer adapter, and minimal developer preview entry.

## Preview Phase Acceptance Criteria

- Existing `npm run verify:hgo-runtime-poc` passes before and after changes.
- Real HGO smoke can write both seed and report under `.runtime/` when an HGO root is provided.
- Renderer adapter maps province RGB data to owner/controller color data without touching the current renderer lifecycle.
- Preview entry can load, render, inspect, and dispose HGO state through a small public boundary.
- UI/public-contract tests prevent non-core UI from importing renderer internals.
- `verify:pages-dist` is run if this phase changes browser-published assets or dist contracts.

## 2026-06-05 Preview Phase Implementation Notes

- Real HGO smoke now runs through `tools/build_hgo_runtime_seed.py`.
  - Output: `.runtime/hgo_runtime/seed.real.json`.
  - Report: `.runtime/reports/generated/hgo_runtime_seed_smoke.real.json`.
  - Result: `status=pass`, `states=11894`, `provinces=20782`, `mapped=20781`, `countries=1431`.
  - Owner/controller missing color count: `0`.
- HGO mod source references base-game owner/controller tags. The builder therefore accepts ordered explicit country color sources:
  - `data/palettes/hgo.palette.json`
  - `data/palettes/hoi4_vanilla.palette.json`
  HGO source country files remain the primary color source when a country file defines `color`.
- Added an independent JS HGO raster renderer adapter.
  - It renders owner or controller colors from province RGB/RGBA raster bytes.
  - It supports hit lookup through the HGO runtime index.
  - It hard-fails malformed raster dimensions and render calls after dispose.
- Added a developer-gated preview boundary.
  - Default startup path stays disabled.
  - Missing loader configuration records `unavailable` and keeps the toolbar button hidden.
  - Load failures record explicit `error`.
  - Toolbar integration is hidden outside developer mode.
  - In-flight preview loads use a generation token so stale loader completions cannot re-enable a disabled preview.
- `verify:pages-dist` generated dist copies for the new HGO runtime modules and passed `tests.test_pages_dist_startup_shell`.

## 2026-06-05 Preview Phase Validation Evidence

- `npm run test:py:hgo-runtime-seed`: passed, 19 tests.
- Real HGO smoke command: passed with the HGO source at `C:\Users\raede\Desktop\dev\mapcreator\historic geographic overhaul`.
- `npm run verify:hgo-runtime-poc`: passed.
  - Python seed tests: 19 passed.
  - Node runtime index tests: 8 passed.
  - Node raster renderer tests: 5 passed.
  - Node preview tests: 10 passed.
  - JS syntax checks and Python compile check passed.
- `node --check js\ui\toolbar.js js\core\hgo_runtime_preview.js js\ui\toolbar\hgo_runtime_preview_controller.js`: passed.
- `python -m unittest tests.test_toolbar_split_boundary_contract.ToolbarSplitBoundaryContractTest.test_toolbar_imports_new_split_modules -q`: passed.
- `npm run verify:pages-dist`: passed, startup shell tests 19 passed.

## 2026-06-05 Preview Phase Review Fixes

- Reviewer flagged stale async preview load completion after disable/dispose. Fixed with `loadGeneration` and a regression test.
- Reviewer flagged a half-connected toolbar entry when app loaders are absent. Fixed by hiding the developer-mode button until both seed and raster loaders are configured.
- Reviewer flagged untracked source/dist/test files as a submit risk. Commit preparation must add all source, dist, and test files referenced by imports/scripts/manifest.

## 2026-06-05 Preview Phase Closeout

- Implementation commit: `89d0a832`.
- Merged into `main` with a fast-forward merge after rebasing onto the current main.
- Pushed `main` to `origin`.
- Removed worktree `C:\Users\raede\Desktop\dev\mapcreator-hgo-runtime-preview`.
- Deleted local branch `codex/hgo-runtime-preview`.
