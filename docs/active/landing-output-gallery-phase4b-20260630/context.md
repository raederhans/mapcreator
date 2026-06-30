# Phase 4B Output Gallery Context

## 2026-06-30 Setup

- Worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase4b-output-gallery`
- Branch: `codex/phase4b-output-gallery-sample-runs`
- Base: `origin/main@12890fc6359c7de2e8f02f2ccc4ed10aceeea39c`
- Parent checkout has unrelated docs WIP and is left untouched.
- Live process owner: main Codex agent only.
- Subagents: static design/test/review lanes only; they must not run or monitor builds/tests/browser/dev-server processes.

## Evidence Inventory

- Current Selected works cards already use:
  - `landing/assets/work-alt-history-med.webp/json/svg`
  - `landing/assets/work-scenario-switch-europe.webp/json/svg`
  - `landing/assets/work-atlas-japan-corridor.webp/json/svg`
- Metadata counts available:
  - TNO Atlantropa: `counts.rendered_atlantropa_features = 896`, `counts.dissolved_country_owners = 47`.
  - Europe scenario switch: `counts.hoi4_1936_political_features = 90`, `counts.hoi4_1939_political_features = 90`.
  - Japan corridor: `counts.road_lines = 95`, `counts.rail_lines = 70`, `counts.major_stations = 18`.
- Phase 4A story uses source markers in HTML and validates them through `tests/landing_showcase_view_behavior.test.mjs`.

## Implementation Notes

- Prefer direct HTML data markers over adding a new JSON file unless the markup becomes repetitive.
- Filter state should be landing-only and should not share runtime/editor state.
- Use the existing source-marker parser pattern in tests.

## 2026-06-30 Implementation Closeout

- Upgraded the former Selected works block into `#sample-runs` with three sample cards:
  - TNO 1962 Atlantropa Mediterranean briefing map.
  - HOI4 1936 / 1939 Europe comparison.
  - Japan Tokaido corridor atlas.
- Each card now carries existing output media, metadata path, scenario/baseline text, layer recipe chips, evidence markers, demo path, and export target.
- Added landing-only filter state through `initSampleRunsGallery()`: click, ArrowLeft/ArrowRight/Home/End, `aria-pressed`, roving `tabindex`, hidden card state, and reduced-motion-safe state updates.
- Added bilingual English/Simplified Chinese keys for sample run labels, filters, recipe/evidence labels, paths, and CTAs.
- Extended Node landing tests for asset/evidence resolution, click filtering, keyboard filtering, reduced-motion behavior, and bilingual keys.
- Extended startup-shell tests for source/dist HTML, app, style, and static nav fallback contracts.

## Validation Evidence

- PASS `npm run verify:pages-dist`: Pages dist rebuilt, startup-shell 41/41, landing Node 18/18, total `971983170` bytes / `926.96 MiB`, `within_warning`.
- PASS `npm run test:node:landing-showcase-view`: 18/18.
- `python -m unittest tests.test_pages_dist_startup_shell -q` could not run because this PowerShell environment has no `python` command on PATH.
- PASS equivalent `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: 41/41.
- PASS `npm run verify:dist-drift`: stable generated dist, total `926.96 MiB`.
- PASS `git diff --check`; only Windows CRLF conversion warning for `tests/test_pages_dist_startup_shell.py`.
- Independent design/test sidecar reviews were incorporated.
- Independent code review found stale `dist/index.html` fallback text; fixed by regenerating dist and adding the static fallback assertion.
- Independent architecture review returned CLEAR after the same stale fallback issue was accounted for.

## Scope Check

- No new large media assets were added.
- No editor runtime, scenario runtime data, HGO Pages payload, or Pages publishing policy files were changed.
- Generated dist mirrors were updated from the normal Pages dist builder.

## 2026-06-30 Rebase And Integration Prep

- Phase 5A preflight found the Phase 4B worktree still unmerged, so Phase 5A stayed paused.
- Created the Phase 4B Lore commit, rebased it over `origin/main@59e4e7b3`, and resolved text conflicts in `docs/active/_worktree_registry.md` and `dist/pages-dist-manifest.json`.
- Reran `npm run verify:pages-dist`: PASS, startup-shell 41/41, landing Node 18/18, Pages dist `971988576` bytes / `926.96 MiB`, `within_limit` and `within_warning`.
- Reran `npm run test:node:landing-showcase-view`: PASS 18/18.
- `python -m unittest tests.test_pages_dist_startup_shell -q` remains unavailable in this PowerShell environment because `python` is not on PATH; the project Python wrapper path passed through `verify:pages-dist`.
- Reran `npm run verify:dist-drift`: the first post-amend run exposed the stale manifest total-byte diff, then the regenerated manifest was committed and the rerun passed.
- Reran `git diff --check`: PASS.
- Current recommendation: preserve parent checkout docs WIP, fast-forward parent `main` to `origin/main@59e4e7b3`, fast-forward merge this branch, then begin Phase 5A from the updated main.
