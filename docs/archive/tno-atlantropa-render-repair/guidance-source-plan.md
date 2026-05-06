# TNO Atlantropa 当前产物修复计划

## Summary
- 本批范围锁定为三件事：`ATL` 海面新色、`ATLISL boolean_weld` 岛体恢复可点、现有 owner/startup 合同保持稳定。
- q50000 candidate 的 `world_bounds_geometries=391` 保留在现有 `controller-topology-architecture-cleanup-2026-05-05` 任务线继续推进，本批把它当 follow-up lane。
- 执行开始后先在 `docs/active/tno-atlantropa-render-repair/` 建立 `plan/context/task` 留档，并把本计划作为指导性计划文件写入。

## Public interfaces / contract changes
- 新增可选 manifest 字段：`style_defaults.atlantropa_sea.fillColor`。TNO 1962 用它定义比 `style_defaults.ocean.fillColor` 更深一档的 ATL 海面色。
- 交互合同改为：`ATLISL_*` 且 `atl_geometry_role=donor_island` 的岛体在 `atl_join_mode=boolean_weld` 下继续可见并恢复可点。
- helper 合同保持为 helper-only：`ATLWLD_*`、`ATLSHL_*`、`ATLSEA_FILL_*`、`shore_seal`、`sea_completion`、`donor_sea` 继续退出交互命中。

## Implementation changes
1. **事实锁定与复现基线**
   - 以当前 checked-in `quantization=100000` 产物作为唯一实施基线。
   - 先做一次定点复现和取证：Mediterranean 总览截图，Cyprus / Balearics / Crete / Sicily 四个点击点，记录命中 `featureId`、`interactive`、`atl_join_mode`、实际填色。
   - 取证脚本优先走现有测试和一次性 `.runtime/tmp` helper；repo 内保持最小新增面。

2. **ATL 海面可读性**
   - 在 renderer 的 Atlantropa sea fill 路径读取 `activeScenarioManifest.style_defaults.atlantropa_sea.fillColor`。
   - TNO manifest 为 `atlantropa_sea.fillColor` 配置一个比 `ocean.fillColor` 略深的固定色值。
   - 当前 batch 不引入 `presentation_water_fill` 分支，不扩 water region schema。

3. **ATLISL boolean_weld 点击恢复**
   - 调整 TNO bundle/build/runtime topology 生成逻辑：`ATLISL` 岛体保持 `interactive=true`，即便 `atl_join_mode==="boolean_weld"`。
   - 保持 synthetic `cntr_code: "ATL"` 和 owner/core 从 `owners.by_feature.json`、`cores.by_feature.json` 驱动的现合同。
   - startup bundle 的 compact `owners/controllers` 继续由现有 owners 派生链生成，避免改动 startup shape。

4. **测试与合同收口**
   - 扩展 `tests/test_tno_bundle_builder.py`，把 `ATLISL boolean_weld` 岛体期望从“不可点”改成“可点”，同时保留 helper geometry 不可点断言。
   - 扩展 `tests/scenario_chunk_contracts.test.mjs`，把 renderer 合同改成“岛体可见且可点，helper 保持 helper-only”。
   - 优先扩展 `tests/e2e/tno_open_ocean_rendering.spec.js`：
     - 断言 ATL 海面采样色与外海采样色存在稳定差异；
     - 断言 Cyprus / Balearics / Crete / Sicily 点击后返回对应 `featureId`；
     - 断言 helper geometry 仍然不会成为最终命中目标。

## Test plan
- `python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962`
- `python -m unittest tests.test_tno_bundle_builder -q`
- `node --test tests/scenario_chunk_contracts.test.mjs`
- `npx playwright test tests/e2e/tno_open_ocean_rendering.spec.js`

## Assumptions
- 本批已锁定新合同：`boolean_weld` 的 `ATLISL` 岛体需要可见且可点。
- 当前工作树里的 special-zone 相关改动保持原样，本批不接触。
- q50000 candidate 泄漏问题继续归属现有 topology cleanup 任务线，等本批 production 症状线收口后再继续推进。
