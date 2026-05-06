# plan

## 目标
- 让 TNO Atlantropa 海面使用独立深色填充。
- 让 `ATLISL_*` 的 `boolean_weld` 岛体恢复可点。
- 保持 startup / owner / helper 几何合同稳定。

## 当前执行批次
1. [x] 建立 worktree 与留档。
2. [x] 复核代码路径与现有测试合同。
3. [x] 实现 renderer + manifest + topology 逻辑修复。
4. [x] 扩展 targeted tests 与取证 helper。
5. [x] 跑定向验证与收尾复核。

## 验收入口
- `python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962`
- `python -m unittest tests.test_tno_bundle_builder -q`
- `node --test tests/scenario_chunk_contracts.test.mjs`
- `npx playwright test tests/e2e/tno_open_ocean_rendering.spec.js`

## 完成结果
- `style_defaults.atlantropa_sea.fillColor` 已落到 renderer、palette、manifest、startup bundle。
- `ATLISL_* + atl_geometry_role=donor_island + atl_join_mode=boolean_weld` 已保持可见、可点、owner 合同稳定。
- `ATLWLD_*`、`ATLSHL_*`、`ATLSEA_FILL_*`、`shore_seal`、`sea_completion`、`donor_sea` 继续维持 helper-only。
- 计划内五个验收入口全部通过。
