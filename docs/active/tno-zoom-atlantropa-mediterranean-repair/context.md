# Context

## Initial evidence
- TNO manifest capped political required chunks too low for dense Mediterranean/Europe zoom views.
- Mediterranean viewports intersect far more political detail chunks than the old budget allowed.
- ATLSEA lives in the political ATL chunk as donor sea geometry, while runtime water render/hit looked at water-region indexes.
- ATLISL donor islands must stay clickable as land and keep owner routing.

## Implemented fixes
- Raised TNO-only political render budget in `data/scenarios/tno_1962/manifest.json` and `tools/scenario_chunk_assets.py`.
- Expanded political chunk clamp in `js/core/scenario_chunk_manager.js` for scenario-provided TNO budgets.
- Changed viewport geo bounds from five-point sampling to 5x5 grid sampling plus small bbox inflation, so curved-projection edge chunks remain eligible.
- Kept zoom-end retained political chunks in active merge payloads through exact-after-settle TTL.
- Projected active `ATLSEA_` donor sea features from political chunks into scenario water runtime, excluding `ATLSEA_FILL_` helper/completion features.
- Rebuilt water caches, auxiliary water indexes, and secondary spatial indexes when ATLSEA projection changes during scenario apply or chunk promotion.
- Preserved land-over-water precedence for ATLISL donor islands.
- Removed an undefined ATLSEA water hit fallback call caught by static review; standard water spatial hit path now owns ATLSEA clicks.

## Verification evidence
- `npm run test:node:scenario-chunk-contracts` passed 22/22.
- `python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_atlsea_runtime_contract_keeps_donor_sea_projectable` passed.
- `npm run test:node:palette-runtime-bridge` passed 17/17.
- `npm run verify:scenario-contracts:strict` passed with `[scenario-contract] OK tno_1962`.
- Targeted Playwright: `tno atlantropa welded donor islands stay clickable and mediterranean sea uses dedicated fill` passed 1/1.
- Runtime artifact: `.runtime/tests/playwright/tno_open_ocean_rendering/tno_atlantropa_runtime_summary.json` recorded 87 ATLSEA water features and 87 water spatial items.
- Screenshot artifact: `.runtime/tests/playwright/tno_open_ocean_rendering/tno_atlantropa_mediterranean_overview.png`.

## Remaining notes
- Full dev scenario-chunk e2e lane had earlier unrelated failures around the open-ocean override path and Great Lakes chunk wait. The targeted Atlantropa gate now passes after the repair.
- The TNO budget increase trades cold-load weight for correctness; future performance work should measure it instead of lowering the budget blindly.

## 2026-05-06 follow-up: Adriatic basin global water overlay
- 用户报告 8597-5838-0 亚得里亚迪卡海盆持续选中，并触发海面覆盖全球；需要先定位根因再修复。
- 验收：该 id 不产生全球覆盖；Adriatic/Atlantropa 水域渲染和交互仍可用；岛屿/下层地块交互保持。
- 根因：`ATLSEA_adriatica_8597_5838_0` 在直接 chunk GeoJSON 中使用了 D3 会解释成“球面补集”的环方向，导致 `d3.geoArea≈4π`、`d3.geoBounds=[[-180,-90],[180,90]]`；ATLSEA water projection 旧路径又跳过了 water geometry sanitizer。
- 修复：TNO ATLSEA donor sea chunk payload 改为 D3 small-polygon 方向；renderer 取消 ATLSEA sanitizer bypass；`tools/scenario_chunk_assets.py` 增加 ATLSEA donor sea orientation normalization；同步 `detail_chunks.manifest.json`、startup bundles、build snapshot、audit。
- 复核：review 子代理要求修 manifest byte_size/source hash，已完成并新增/复用 manifest byte_size 测试。
- 验证：`node .runtime/tmp/diag_atlsea_all.js` 显示目标 id area `0.0003759089728797262`、bounds `[16.7283,40.9204]-[19.0090,42.5667]`、world=false；`npm run verify:scenario-contracts:strict` OK；`npm run test:node:scenario-chunk-contracts` 23/23；Python targeted unittest 3/3；targeted Playwright 1/1。
- Runtime artifact：`.runtime/tests/playwright/tno_open_ocean_rendering/tno_atlantropa_runtime_summary.json` 中 `clickedAdriaticBasin.hit.id=ATLSEA_adriatica_8597_5838_0`、`targetType=water`、`isWorldBounds=false`、`containsGlobalProbe=false`。

## 2026-05-06 review follow-up: coarse political chunk minified
- Review blocker: `political.coarse.r0c0.json` drifted to pretty JSON and `detail_chunks.manifest.json` recorded `byte_size=81779429`, creating an 81.8MB low-zoom payload.
- Fix: reran chunk generation with minified writer and repaired tuple-coordinate ATLSEA orientation normalization so regenerated chunk output keeps D3 small-polygon donor sea semantics.
- Current evidence: `political.coarse.r0c0.json` is `32000010` bytes, manifest `byte_size=32000010`, prefix is compact JSON, and no pretty newline appears in the prefix.
- Source sync: strict write-safe refreshed `manifest.json`, startup bundles, `build_snapshot.json`, and `audit.json` after the detail chunk manifest hash changed.
- Verification: `python -m unittest tests.test_scenario_chunk_assets -q` OK; `npm run test:node:scenario-chunk-contracts` 23/23; `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962` OK.
