# Landing Local Work Maps Context

2026-06-17:
- User approved the three-capability composition:
  - TNO 1962 Atlantropa Mediterranean local map for alternate-history geography.
  - HOI4 1936/1939 Central/Eastern Europe switch map for scenario state changes.
  - Japan Corridor multi-layer map for atlas/output polish.
- Current integration worktree: `C:\Users\raede\.codex\worktrees\mapcreator-landing-work-maps-integration`, branch `codex/landing-work-maps-integration`, base `origin/main@6874731f`.
- Original implementation source checkout: `C:\Users\raede\Desktop\dev\mapcreator`, branch `codex/tno-political-color-recovery`; it also contains unrelated renderer WIP and is preserved as a recovery/source tree only.
- Main Codex agent owns all live commands, long builds/tests, and browser checks.
- Subagent `019ed7b3-1cb1-7de1-bae0-ff052285aaef` owns read-only static review only.
- Existing generation surfaces:
  - `tools/build_landing_europe_1936_showcase.py` builds hero/showcase scenario assets.
  - `tools/build_landing_japan_preview.py` builds Japan preview layers.
  - `tools/rasterize_landing_assets.py` rasterizes landing SVG assets to WebP.
  - `npm run verify:pages-dist` runs `tools/build_pages_dist.py`, startup shell tests, and landing showcase behavior tests.

Progress:
- [x] Plan accepted by user.
- [x] Worktree checked: clean at start.
- [x] `lessons learned.md` and `docs/shared/agent-tiers.md` read.
- [x] Implementation complete.
- [x] Verification complete.

Implementation notes:
- Added `tools/build_landing_work_maps.py` to build three source-backed local map assets:
  - `work-alt-history-med`: TNO 1962 Atlantropa Mediterranean political and physical context.
  - `work-scenario-switch-europe`: HOI4 1936/1939 Central Europe same-bbox comparison.
  - `work-atlas-japan-corridor`: Japan Tokaido corridor roads, rail, stations, lights, rivers, and terrain.
- Extended `tools/rasterize_landing_assets.py` so the new SVGs rasterize to WebP and are copied by Pages dist.
- Updated landing and dist work-card image references, alt text, and i18n copy.
- Added a landing Node test that validates metadata structure, source path existence, bbox contract, and positive feature counts.
- Revised `work-alt-history-med` after browser feedback:
  - widened bbox to the full Mediterranean basin.
  - replaced low-detail political feature slices with TNO political detail chunks dissolved by owner.
  - removed internal province/block boundaries from the rendered country view.
  - dissolved Atlantropa land/shoal layers and skipped blocky water/relief boundary rendering.
  - removed in-image labels so the bento card crop does not cut text.
  - removed visible `scenario_water` topology rendering after static review found remaining sea block seams.
  - removed the Atlantropa hard cap; latest metadata records `source_atlantropa_features=896` and `rendered_atlantropa_features=896`.

Verification notes:
- `py -3 -m py_compile tools\build_landing_work_maps.py tools\rasterize_landing_assets.py`: passed.
- `py -3 tools\build_landing_work_maps.py`: passed, wrote three SVG/JSON assets.
- `py -3 tools\rasterize_landing_assets.py`: passed, wrote WebP assets.
- `py -3 tools\build_pages_dist.py`: passed, latest total size `1099.51 MiB`.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: passed, 37 tests.
- `npm run test:node:landing-showcase-view`: passed, 8 tests.
- Review fix: `tests.test_pages_dist_startup_shell` now includes all nine `work-*` landing/dist assets in the manifest presence and byte-parity contract.
- Review fix: old hero/showcase asset raster output was restored to base state so the integration diff only carries the new work-card assets.
- Browser check at `http://localhost:8000/`: three work-card images loaded with natural sizes, no console errors, no page errors, no 4xx/5xx failures.
- Browser screenshots:
  - `.runtime/browser/landing-work-maps-viewport-final.png`
  - `.runtime/browser/landing-work-maps-japan-final.png`
  - `.runtime/browser/landing-tno-atlantropa-fix-final.png`
  - `.runtime/browser/landing-tno-atlantropa-no-blocks-final.png`
- Static review by subagent `019ed7d0-08af-73d2-bbfd-67f1e1c7345d`: APPROVE after fixing metadata source truth and dist metadata coverage.
- Static review by subagent `019ed7ec-e59d-7b30-b43e-c8b7360ebaaf`: CHANGES REQUESTED for visible `scenario_water` seams, Atlantropa hard cap, and missing TNO-specific test coverage; all three findings were fixed and covered by `TNO work-card map uses dissolved detail sources without visible topology blocks`.

Known environment note:
- `npm run verify:pages-dist` did not complete through npm because Windows cmd cannot resolve `python`; the equivalent command chain passed with `py -3`.
