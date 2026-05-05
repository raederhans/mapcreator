# Appearance + Transport Platformization Plan

## 目标

把 appearance 相关的 Color Library 收口项和 transport visibility 收口项合并成一条主任务留档。旧目录继续保留原始过程记录，本目录作为当前推进、验证、归档判断的唯一主任务入口。

## 来源目录

- `docs/active/color-library-improvement/`
- `docs/active/transport-panel-visibility/`

## 当前主线

主线是 appearance + transport 平台化收口：把颜色库、外观开关、transport family 可见性、runtime metrics、面板状态说明统一到可验证的 UI/runtime contract 上。本轮已经把收口验证、稳定性债务第一批和 owner extraction 第一批一起做完，当前进入归档阶段。

## 已完成项

- Color Library shell contract 已落地：默认展开、source tabs、隐藏兼容 `#themeSelect`、Recent 分组、搜索清空、空结果文案、行双击/Enter 应用、roving tabindex 修复。
- Color state contract 已建立最小闭环：`js/core/color_resolver.js` 成为 feature color precedence seam，renderer 委托 resolver，owner/feature 真源边界已写明。
- Color Library targeted Node/Python 验证已通过：palette runtime bridge、renderer runtime state、i18n audit、i18n unittest、perf snapshot、perf gate contract、toolbar split boundary contract。
- Transport visibility 修复已完成：Road/Rail staged metrics、`contextBreakdown` allowlist、`releaseDeferredContextBasePassFn`、transport master/family toggle release wiring、静态测试扩展。
- Transport targeted 验证已通过：renderer/controller `node --check`、`node --test tests/physical_layer_contracts.test.mjs`、focused `test_transport_toggles_release_deferred_context_markers` unittest。
- Transport runtime smoke 已验证 hook 行为：释放 `deferContextBasePass`、清理 `stagedContextBaseHandle`、记录 `releaseDeferredContextBasePass`，并包含 `canceledStagedContextBase: true`。

## 已完成的后续稳定性债务

- `data/manifest.json` / `data/locales.json` drift 已修复并通过 contract test。
- state allowlist 已从 `83 -> 77`，新增出列：
  - `dirty_state.js`
  - `palette_manager.js`
  - `scenario_data_health.js`
  - `scenario_controls.js`
  - `scenario/pure_helpers.js`
  - `scenario_post_apply_effects.js`
- `transport_overview_render_owner.js` 的 `styleConfig.transportOverview` 归一化写口已收回 `ui_state` owner。
- `map_renderer.js` owner extraction 已继续推进两刀：
  - `transport_overview_render_owner.js`
  - `river_layer_render_owner.js`
- `init_map_data.py` 的 `hierarchy_locales` stage seam 已下沉到 `map_builder/hierarchy_locale_stage.py`。

## 当前阶段结果

- appearance + transport 平台化收口已经完成。
- `color-library-improvement` 与 `transport-panel-visibility` 两个旧 active 目录已经转入 archive。
- 本任务 backlog 已完成，当前主任务目录也满足归档条件。

## 已执行的最终验证

- `npm run test:e2e:ui-rework-support`
- `bash ops/browser-mcp/run-smoke-browser-inspection.sh --mode quick`
- `python -m unittest tests.test_data_manifest_contract -q`
- `python -m unittest tests.test_build_orchestrator -q`
- `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_toolbar_split_boundary_contract tests.test_ui_rework_plan03_support_transport_contract -q`
- `python -m unittest tests.test_scenario_resources_boundary_contract tests.test_state_write_guardrail_contract tests.test_transport_facility_interactions_contract tests.test_global_transport_builder_contracts -q`
- `node --test tests/palette_runtime_bridge.node.test.mjs tests/renderer_runtime_state_behavior.test.mjs tests/city_lights_asset_contract.test.mjs`
- `node --test tests/scenario_runtime_state_behavior.test.mjs tests/scenario_pure_helpers.node.test.mjs`
- `npm run verify:state-write-allowlist`
- `npm run test:node:river-layer-contracts`

## 归档条件

- 当前主任务的 backlog 已全部完成，验证结果已写入 `context.md`。
- 主线程已独占完成 live browser/live tests，并留下证据路径。
- `task.md` 所有任务已打勾。
- 本目录现在移入 `docs/archive/appearance-transport-platformization/`。
