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
