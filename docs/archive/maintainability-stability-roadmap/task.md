# Maintainability / Stability Roadmap Task Ledger

## Drift Ledger

### 环境噪音
- `.omx/metrics.json`：环境运行噪音，不计入本轮业务改动。

### PRD drift
- [x] 路线图里的“road/rail apply bridge 当前仍未开通”仍是 live 缺口。
  - 现象：`js/core/transport_capability_registry.js` 虽然把 `road/rail/airport/port` 标成 `main_map_bridge`，但 `getTransportWorkbenchOverviewBridgeSupport(...)` 仍对 `road/rail` 直接返回 `supported: false`；`js/ui/toolbar/transport_workbench_controller.js` 因此继续把 road/rail 的 Apply 按钮压成 preview-only。
  - owner：阶段 5
  - 处理：阶段 5 打开 road/rail 的真实 bridge 支持，并同步修正对应测试。
  - 结果：已修复；`tests.test_transport_workbench_manifest_runtime_contract` 现在要求 road/rail `supported: true` 并通过。

### test drift
- [x] `tests.test_transport_facility_interactions_contract` 仍断言旧 owner 位置的 `primaryColor`。
  - 现象：`python -m unittest tests.test_transport_facility_interactions_contract -v` 失败在 `test_state_and_i18n_cover_transport_primary_color_and_more_fields`，断言 `state.js` 内存在 `primaryColor: "#1d4ed8"` / `"#b45309"`；当前真实 owner 已在 `js/core/transport_capability_registry.js`。
  - owner：阶段 5
  - 处理：改测试去钉真实 registry owner，并同步检查 i18n / appearance controller 合同。
  - 结果：已修复；contract 改为钉 `js/core/transport_capability_registry.js` 的真实 owner。

### state guardrail drift
- [x] `node tools/check_state_write_allowlist.mjs` 当前红灯。
  - 现象：Unexpected direct state write files 为 `js/ui/sidebar/project_support_diagnostics_controller.js` 和 `tests/e2e/support/fixtures.js`。
  - owner：阶段 2
  - 处理：前者收进 diagnostics owner helper；后者需要评估 guardrail 扫描范围或给测试 fixture 合法写口。
  - 结果：已修复；guardrail 现在覆盖 `state/runtimeState/appState` alias，主线程复跑全绿。

## Verification Evidence
- `git status --short`
  - ` M .omx/metrics.json`
  - `?? docs/active/maintainability-stability-roadmap/`
- `node tools/check_state_write_allowlist.mjs`
  - failed: `js/ui/sidebar/project_support_diagnostics_controller.js`
  - failed: `tests/e2e/support/fixtures.js`
- `python -m unittest tests.test_transport_facility_interactions_contract -v`
  - failed: stale assertion on `primaryColor` in `state.js`
- `node tools/e2e_layering.mjs check`
  - passed
- `rg -n -S 'file:///C:/Users/raede/Desktop|data/.+\\.(json|geojson)' js`
  - 现在只剩 `js/core/data_loader.js`
- `python tools/check_transport_workbench_manifests.py --root data/transport_layers`
  - passed: `[transport-contract] OK`
- `python tools/check_scenario_contracts.py --strict`
  - passed: `blank_base / hoi4_1936 / hoi4_1939 / modern_world / tno_1962`
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_data_manifest_contract tests.test_local_canonicalization tests.test_build_orchestrator tests.test_state_write_guardrail_contract tests.test_transport_facility_interactions_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_scenario_manager_boundary_contract tests.test_map_renderer_border_mesh_owner_boundary_contract -v`
  - passed: `Ran 105 tests ... OK`
- `python -m unittest tests.test_data_manifest_contract tests.test_build_orchestrator tests.test_local_canonicalization tests.test_startup_shell tests.test_scenario_manager_boundary_contract tests.test_map_renderer_border_mesh_owner_boundary_contract -v`
  - passed: `Ran 31 tests ... OK`
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_state_write_guardrail_contract tests.test_transport_facility_interactions_contract tests.test_transport_workbench_manifest_runtime_contract -v`
  - passed: `Ran 77 tests ... OK`
- `node --test tests/scenario_runtime_state_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/border_mesh_owner_behavior.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/renderer_runtime_state_behavior.test.mjs`
  - passed: `31/31`
- `node --test tests/startup_hydration_behavior.test.mjs tests/scenario_runtime_state_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/border_mesh_owner_behavior.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/renderer_runtime_state_behavior.test.mjs`
  - passed: `40/40`
- `node --test tests/startup_hydration_behavior.test.mjs`
  - passed: `9/9`
- `python -m unittest tests.test_startup_shell -v`
  - passed: `2/2`
- `node --check js/core/runtime_asset_registry.js js/core/data_loader.js js/core/startup_cache.js js/core/map_renderer.js js/core/sovereignty_manager.js js/core/unit_counter_icon_libraries.js js/ui/transport_workbench_carrier.js`
  - passed
- `python -m py_compile init_map_data.py map_builder/config.py map_builder/contracts.py map_builder/runtime_asset_registry.py map_builder/country_feature_policies.py map_builder/processors/config_subdivisions.py map_builder/geo/local_canonicalization.py tests/test_build_orchestrator.py tests/test_data_manifest_contract.py tests/test_startup_shell.py`
  - passed

## Notes
- 所有阶段共享这一份 ledger，后续逐条更新 owner、现象、修复阶段、验证结果。
- 阶段 7 当前 live code 已有的增长型静态规则 owner 已收进 `country_feature_policies.json`；后续若新增 Antarctica / color / UI scale 规则扩张，继续沿同一 policy-table 模式推进。
- review/critic 发现的两个必须修问题都已收掉：
  - runtime asset registry 现在由 `data/runtime_asset_registry.json` 单点生成，并通过 `js/core/runtime_asset_registry.js` 给 JS 使用
  - `map_builder/config.py` 不再硬编码 protected subdivision countries
