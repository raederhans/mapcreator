# Maintainability / Stability Roadmap Task Ledger

## Active Drift Ledger

### 环境噪音
- `.omx/metrics.json`：环境运行噪音，不计入本轮业务改动。

### Batch 0 已收口
- [x] Pages dist 漏发 `runtime_asset_registry.json`
  - 处理：`tools/build_pages_dist.py` 发布 `runtime_asset_registry.json`，`tests/test_pages_dist_startup_shell.py` 钉住 dist manifest。
  - 结果：`python tools/build_pages_dist.py`、`python -m unittest tests.test_pages_dist_startup_shell -v` 通过。

- [x] maintainability 路线图已恢复为 active 任务
  - 处理：`docs/archive/maintainability-stability-roadmap/` 恢复为 `docs/active/maintainability-stability-roadmap/`，后续统一在本目录继续迭代。

- [x] transport 当前产品口径重新冻结
  - 处理：live code 与 contract 统一确认 `road/rail` 继续 preview-only，`airport/port` 继续条件开放。
  - 结果：`tests.test_transport_workbench_manifest_runtime_contract`、`tests.test_transport_facility_interactions_contract` 通过。

### Batch 1 已收口
- [x] state guardrail ratchet
  - 处理：`preset_state.js`、`interaction_funnel/ui_sync.js`、`scenario_owner_metrics.js`、`scenario_ui_sync.js` 改走 owner helper。
  - 结果：`node tools/check_state_write_allowlist.mjs` 输出 `83 tracked files`。

- [x] JS/Python 共读 policy table v2
  - 处理：
    - `data/country_feature_policies.json` 升到 `schema_version: 2`
    - 新增 `js/core/country_feature_policies.js`
    - `map_builder/country_feature_policies.py` 支持 display policy
    - `country_feature_policies.json` 纳入 `runtime_asset_registry.json`
  - 结果：`tests.test_country_feature_policies_contract`、`tests.test_data_manifest_contract` 通过。

- [x] feature identity 主路径迁移
  - 处理：
    - 主线程 `data_loader.js`、`logic.js`、`i18n.js`、`map_renderer.js` 统一走 shared helper
    - 新增 `js/core/feature_identity_shared.js`
    - `startup_boot.worker.js` 改成委托共享 helper，只保留 worker alias 适配
  - 结果：`tests/feature_identity_shared.node.test.mjs`、`tests/palette_runtime_bridge.node.test.mjs` 通过。

### Batch 2 当前状态
- [x] historical 1930 city lights 外部化
  - 处理：
    - `tools/build_city_lights_historical_1930_asset.py` 输出 metadata JS + entries JSON
    - `js/core/city_lights_historical_1930_asset.js` 只保留 metadata + loader
    - 新增 `data/city_lights/historical_1930_entries.json`
  - 结果：`tests/city_lights_asset_contract.test.mjs`、`tests.test_data_manifest_contract`、`tests.test_pages_dist_startup_shell` 通过。

- [x] runtime asset registry 第二波主路径收口
  - 处理：
    - registry 吸收 world cities、city aliases、runtime political、context layers、transport catalogs/manifests、city lights entries、country feature policies
    - `js/core/data_loader.js` 改走 `resolveDataAssetUrl(...)`
    - 未发布的 detail topology 变体明确留在 `data_loader.js` 本地常量，避免 Pages 部署版出现缺文件路径
  - 结果：manifest 与 Pages dist 口径一致，`python tools/build_pages_dist.py` 当前体积 `947.20 MiB`。

- [x] 颜色与渲染主动防线
  - 已完成：
    - `tests/palette_runtime_bridge.node.test.mjs` 已补 color manager cache signature / hex normalization
    - `tests/physical_layer_contracts.test.mjs`、`tests/scenario_chunk_contracts.test.mjs`、`tests/river_layer_contracts.test.mjs` 已覆盖 physical / political raster / river 主路径
    - targeted Playwright 中 `physical_layer_regression.spec.js` 已通过
    - `river_layer_regression.spec.js` 已拆成 3 条 targeted test，并补上：
      - startup preload warning allowlist
      - render-idle 等待链
      - 首次 fresh page subset 重新应用校验
  - 结果：
    - `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js --workers=1 --retries=0`
    - `3 passed (5.3m)`，日志：`.runtime/tests/playwright/batch23-river-split-fix4.out.log`

### Batch 3 当前状态
- [x] scenario transaction seam
  - 处理：`js/core/scenario_apply_pipeline.js` 已拆成 `preCommit -> commit -> postCommit`。
  - 结果：`tests.test_scenario_manager_boundary_contract`、`tests/scenario_lifecycle_runtime_behavior.test.mjs` 通过。

- [x] transport preview registry config-driven factory
  - 处理：`js/ui/transport_workbench_family_preview.js` 改为 registry config + factory dispatch。
  - 结果：`tests.test_transport_workbench_manifest_runtime_contract` 通过，road/rail 仍 preview-only。

- [x] `map_renderer.js` 渐进瘦身
  - 已完成：
    - `js/core/renderer/city_label_owner.js`
    - `js/core/renderer/color_resolution_strategy.js`
    - `js/core/renderer/render_pipeline_passes.js`
    - `js/core/renderer/render_cache_owner.js`

- [x] `init_map_data.py` stage 化
  - 已完成：
    - `map_builder/base_stage.py`
    - `map_builder/validation_schema.py`
    - `map_builder/detail_topology_stage.py`
    - `map_builder/runtime_political_topology_stage.py`
    - `map_builder/primary_topology_stage.py`

## Verification Evidence
- `python tools/build_pages_dist.py`
  - passed: total size `947.20 MiB`
- `python -m unittest tests.test_pages_dist_startup_shell -v`
  - passed
- `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_facility_interactions_contract -v`
  - passed
- `node tools/check_state_write_allowlist.mjs`
  - passed: `State write allowlist passed with 83 tracked files.`
- `python -m unittest tests.test_country_feature_policies_contract tests.test_data_manifest_contract -v`
  - passed
- `node --test tests/feature_identity_shared.node.test.mjs`
  - passed
- `node --test tests/palette_runtime_bridge.node.test.mjs`
  - passed
- `python -m unittest tests.test_build_orchestrator -v`
  - passed: `21 tests OK`
- `node --test tests/city_lights_asset_contract.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/physical_layer_contracts.test.mjs tests/scenario_chunk_contracts.test.mjs`
  - passed
- `python -m unittest tests.test_map_renderer_city_label_owner_boundary_contract -v`
  - passed
- `python -m unittest tests.test_map_renderer_color_resolution_strategy_boundary_contract -v`
  - passed
- `python -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract -v`
  - passed
- `node --test tests/feature_identity_shared.node.test.mjs tests/city_lights_asset_contract.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/river_layer_contracts.test.mjs tests/physical_layer_contracts.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`
  - passed: `60 tests OK`
- `node --test tests/river_layer_contracts.test.mjs`
  - passed: `2 tests OK`
- `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js --workers=1 --retries=0`
  - passed: `3 passed (5.3m)`，日志：`.runtime/tests/playwright/batch23-river-split-fix4.out.log`

## Notes
- 本任务留档已归入 `docs/archive/maintainability-stability-roadmap/`。
- 子代理中途生成的额外 docs 目录不作为正式 task 载体，收尾时统一并回到本目录。
- `map_renderer.js` 当前可验收为四个 owner extraction 完成；后续真正瘦身空间留给后续批次。
- `init_map_data.py` 当前可验收为 stage seam 完成；兼容 wrapper 仍保留在入口壳层。
- 最终复核、lessons learned 回写、active -> archive 归档均已完成。
