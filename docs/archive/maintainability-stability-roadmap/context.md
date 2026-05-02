# Maintainability / Stability Roadmap Context

## 2026-05-02 启动
- 输入基准：用户要求按既有路线图直接执行到全部完成，并尽可能多部署子代理辅助。
- 已读取：`lessons learned.md`、`docs/shared/agent-tiers.md`、`docs/active/transport-panel-visibility/plan.md`、`docs/active/app-performance-overhaul/plan.md`、`.omx/plans/prd-appearance-transport-platformization-20260501.md`、`.omx/plans/test-spec-appearance-transport-platformization-20260501.md`。
- 当前仓库初始 `git status --short`：`.omx/metrics.json` 已修改，按计划记为环境噪音。
- 当前留档目录为本任务唯一 plan/context/task 载体，后续阶段持续迭代。
- 阶段 0 首轮基线结果：
  - `node tools/check_state_write_allowlist.mjs` 红灯，命中 sidebar diagnostics controller 与 e2e fixture。
  - `python -m unittest tests.test_transport_facility_interactions_contract -v` 红灯，原因是测试仍盯 `state.js` 的旧 `primaryColor` owner。
  - `node tools/e2e_layering.mjs check` 通过。
  - 进一步核对后确认：road/rail `main_map_bridge` 元数据已存在，但 bridge support 仍硬关，所以 PRD drift 仍是代码缺口。
  - `python -m unittest tests.test_global_transport_builder_contracts -v` 当前通过，说明 transport-panel-visibility active docs 里提到的 4 个 builder 静态红灯已经与 live repo 脱节。

## 当前执行原则
- 主线程负责实现集成、串行验证、共享文件集成。
- 子代理负责静态审计、独占文件实现、review 与验收建议。
- 长测试全部串行，由主线程独占。

## 2026-05-02 第二轮集成
- 阶段 1 收口补了一轮：`data_loader.js` 的 runtime asset registry 继续扩到 build manifest、global bathymetry、transport carrier、feature migration、HOI4 unit counter manifest；`transport_workbench_carrier.js`、`map_renderer.js`、`sovereignty_manager.js`、`unit_counter_icon_libraries.js`、`startup_cache.js` 都改为查表。
- `js/core/city_lights_historical_1930_asset.js` 改成保存 `sourceKey/exclusionsKey` 和 repo-relative parts 元数据，源码树里 `rg -n -S 'file:///C:/Users/raede/Desktop|data/.+\\.(json|geojson)' js` 现在只剩 `data_loader.js`。
- 阶段 7 第一波完成：新增 `data/country_feature_policies.json` 和 `map_builder/country_feature_policies.py`，`config_subdivisions.py`、`local_canonicalization.py` 改为从政策表取 protected countries / country gate / support tiers。
- 阶段 8 最短切口完成：
  - `js/core/state/scenario_runtime_state.js` 新增 `commitScenarioActivationRuntimeState(...)`
  - `js/core/scenario_apply_pipeline.js` 改为先组装 staged commit payload，再调用 helper
  - `js/core/renderer/border_mesh_owner.js` 接管 `getFrontlineOwnershipContext()` / `getFrontlineMesh()`
  - `js/core/map_renderer.js` 只保留调用 owner 的 facade
- review / 第一性原理复核后又补了两处收口：
  - 抽 `js/core/runtime_asset_registry.js` + `data/runtime_asset_registry.json`，打断 `startup_cache.js` ↔ `data_loader.js` 的循环依赖
  - `init_map_data.write_data_manifest(...)` 改为每次直接读 `runtime_asset_registry.json` 生成 `runtime_asset_registry`，`map_builder/config.py` 也改为从政策表读取 protected subdivision countries
- strict scenario drift 根因确认是三个场景的 `locales.startup.json` 已更新，但 `build_snapshot.json` / `manifest.json` / `audit.json` 还停在旧 fingerprint。主线程用 scoped `--write-safe` 修复后，全量 `python tools/check_scenario_contracts.py --strict` 已恢复全绿。
- `docs/active/phase-6-feature-identity-helper/` 的有用信息已并回本目录：范围只限共享 helper + 指定文件，`startup_boot.worker.js` 仍是 classic worker，后续若要共用 helper 需要单独处理 `importScripts` 路径。
