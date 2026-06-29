# Public Display Trust Sync Phase 1 Context

## 2026-06-29 Initial Evidence

- Worktree created at `C:\Users\raede\.codex\worktrees\scenario-forge-phase1`.
- Branch `codex/phase1-public-trust-sync` tracks `origin/main`.
- `HEAD`, `origin/main`, and merge-base all resolve to `c59bb7d7eb26799195f7d5dc9a1d5cc29ea3ff13` at task start.
- Branch was later rebased onto `origin/main@f0000344cb64175f18d07e3ab50339d5b0aba9a7` after P28/P29 landed on main, then onto `origin/main@e0bd74b989b79184c0c25c14fdfbcf233238b559` after P30 landed.
- Parent checkout remains dirty with unrelated docs/archive cleanup WIP and is not part of this task.
- `data/scenarios/index.json` lists 6 scenarios, including `hgo_1936`.
- README copy already supports the maturity policy: 5 public baselines, HGO as developer/local preview.
- `data/CATALOG.json` reports `counts.entries = 658`.
- `landing/index.html` hardcodes public stats in `data-stat-value`; the catalog stat currently matches 658 but is not protected by source-of-truth regression.
- `tools/build_pages_dist.py` uses a hard size cap above the GitHub Pages 1 GiB published-site limit.
- Existing guide E2E coverage already restores `view=guide`; strengthen it rather than creating a duplicate test lane.

## Subagent Notes

- Code-mapper lane: public copy and data truth source inspection only.
- Test-engineer lane: existing manifest, landing, and E2E test placement inspection only.
- Main thread owns all build/test/browser processes.

## 2026-06-29 Implementation Closeout Evidence

- Public scenario policy is now explicit in `data/scenarios/index.json`: `public_baseline_ids` lists Blank Map, Modern World, HOI4 1936, HOI4 1939, and TNO 1962; `developer_preview_ids` lists HGO 1936.
- README, Chinese README, landing source, landing translations, and rebuilt `dist/index.html`/`dist/app.js` agree on the 5 public baselines plus HGO developer/local preview policy.
- Landing stat markers now point to parseable JSON fields, including `data/scenarios/index.json:public_baseline_ids.length` and `landing/assets/japan-preview.json:counts.road_source_features+counts.rail_source_features`.
- `tools/build_pages_dist.py` now uses a 1 GiB hard cap and writes `size_gate`, `largest_files`, and `top_level_directories` into `dist/pages-dist-manifest.json` before enforcing the size gate.
- Current Pages dist manifest is valid JSON and reports `total_bytes=1155317661`, `max_allowed_bytes=1073741824`, `size_gate.status=over_limit`, and `size_gate.over_by_bytes=81575837`.
- Largest current Pages payloads are `app/data/transport_layers/japan_industrial_zones/industrial_zones.open.preview.geojson` (55,095,698 bytes), `app/data/hgo_runtime/provinces.bmp` (39,321,654 bytes), `app/data/scenarios/tno_1962/chunks/water.detail.r1c2.json` (30,443,516 bytes), `app/data/city_aliases.json` (30,194,842 bytes), and `app/data/scenarios/hgo_1936/runtime_topology.topo.json` (30,079,615 bytes).
- Independent code-reviewer requested changes on two stat markers and delivery docs. Both stat-marker issues were fixed by adding scenario maturity fields and making the landing test resolve source markers.

## 2026-06-29 Verification

- PASS: `npm run test:node:landing-showcase-view` -> 9 tests passed.
- PASS: `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q` -> 39 tests passed.
- PASS: focused Playwright direct guide URL test with parent `node_modules` via `NODE_PATH` -> 1 test passed.
- EXPECTED FAIL: `npm run python -- tools/build_pages_dist.py` -> `Pages dist size gate failed: 1101.80 MiB exceeds 1024.00 MiB by 77.80 MiB`.
- EXPECTED FAIL: `npm run verify:pages-dist` -> same 1 GiB size gate failure before downstream checks.
- EXTRA CHECK FAIL: `npm run python -- -m unittest tests.test_data_catalog_contract tests.test_data_manifest_contract -q` failed on `locales.json: size/hash drift`. `git status` shows no `data/locales.json` or `data/manifest.json` changes in this worktree, so this is recorded as an existing manifest drift outside the Phase 1 patch scope.
