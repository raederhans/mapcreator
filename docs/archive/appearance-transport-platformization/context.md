# Appearance + Transport Platformization Context

## 2026-05-05 docs 收口

本轮只创建 `docs/active/appearance-transport-platformization/` 下的 `plan.md`、`context.md`、`task.md`。写域限制为该目录；旧 active 目录保持原位。

## 融合依据

### Color Library

来自 `docs/active/color-library-improvement/`：

- 计划中的 shell contract 和 color state contract 已实现。
- 上轮可执行 Node/Python 验证已通过。
- Playwright E2E 与 browser quick 受本机 runner / WSL server 环境阻塞，继续作为主线程验证项。
- review follow-up 已修复隐藏 details 内颜色行参与 roving focus 的问题。

### Transport Panel Visibility

来自 `docs/active/transport-panel-visibility/`：

- Airport/Port/Rail/Road 的 visibility 链路修复已完成。
- renderer staged metrics、deferred context release hook、transport toggle wiring 和 focused tests 已完成。
- runtime smoke 已验证 release hook 行为。
- 完整 `tno_1962` transport 视觉验证仍待主线程补跑。
- `tests/test_global_transport_builder_contracts.py` 仍有 4 个旧静态 contract failure 需要复核归属。

## 当前推进口径

- 主线程独占 live browser 和 live tests。
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 由代码 owner 串行集成。
- 本目录只做 docs 主任务收口，作为后续验证和归档判断入口。
- 旧目录继续作为历史证据来源，当前进度以本目录三份文件为准。

## 本轮验证

- 已读取 `lessons learned.md`。
- 已读取旧任务目录中的 `plan.md`、`context.md`、`task.md`、`implementation-plan.md`。
- 已执行 `git status --short -- docs/active docs/archive`，执行前相关 docs 路径无已登记改动。
- 已执行 `git diff --check -- docs/active/appearance-transport-platformization`，whitespace error 数为 0。`git status --short -- docs/active docs/archive` 只显示新目录。
- 本轮未跑长测试，符合用户要求。

## 2026-05-05 fresh verification

- 已复查目标目录只包含 `plan.md`、`context.md`、`task.md`。
- 已复查 `git status --short -- docs/active docs/archive`，只显示 `docs/active/appearance-transport-platformization/` 新目录。
- 已复查 `git ls-files -m -- docs/active docs/archive`，tracked docs 修改数为 0。
- 已复查 `git ls-files -o --exclude-standard -- docs/active docs/archive`，只列出新目录三份文件。
- 已复查 `git diff --check -- docs/active/appearance-transport-platformization`，whitespace error 数为 0。
- 已复查关键覆盖：Color Library Playwright、browser quick、`tno_1962` transport visual validation、`tests/test_global_transport_builder_contracts.py` 旧 failure、主线程独占 live browser/live tests、旧目录保持原位。
- 本轮继续保持不跑长测试。

## 2026-05-05 fresh verification 2

- 已复查旧目录仍在原位：`docs/active/color-library-improvement/` 与 `docs/active/transport-panel-visibility/` 均存在。
- 已复查归档目录未新增本任务目录：`docs/archive/appearance-transport-platformization` 存在值为 `False`。
- 已复查 markdown 结构：`plan.md` 有 1 个 H1、6 个 H2；`context.md` 有 1 个 H1、5 个 H2；`task.md` 有 1 个 H1、3 个 H2。
- 已复查 checklist：`task.md` 中 docs 收口 7 项完成，后续验证与归档准备 8 项待主线程执行。
- 已复查旧目录与 `docs/archive` 的 git status 为空，旧目录未被移动或修改。
- 已复查 `git diff --check -- docs/active/appearance-transport-platformization`，whitespace error 数为 0。
- 本轮继续保持不跑长测试。

## 2026-05-05 fresh verification 3

- 已复查 OMX state：`ultrawork` 当前 `active=false`，phase 为 `verified`。当前 hook 提示与 state 文件状态存在漂移，本轮按任务要求继续做轻量复查并记录证据。
- 已复查目标目录文件数为 3，文件集合精确为 `context.md`、`plan.md`、`task.md`。
- 已复查目标目录三份文件均为 untracked 新文件，符合“只创建新目录和新文件”的写域要求。
- 已复查 `docs/active` 与 `docs/archive` 中目标目录以外没有 git status 输出。
- 已复查旧目录与 `docs/archive` 仍保持 clean。
- 本轮继续保持不跑长测试。

## 2026-05-05 主线程验证与收口

- `python -m unittest tests.test_data_manifest_contract -q` 通过，`data/manifest.json` 中 `locales.json` 的 size/hash/ui_entry_count 已与当前实际文件对齐。
- `npm run verify:state-write-allowlist` 通过，allowlist 先从 `83 tracked files` 收口到 `81 tracked files`，随后继续收口到 `80 tracked files`；`dirty_state.js`、`palette_manager.js`、`scenario_data_health.js` 已出列。
- `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_toolbar_split_boundary_contract tests.test_ui_rework_plan03_support_transport_contract -q` 通过，`Ran 51 tests / OK`。
- `node --test tests/palette_runtime_bridge.node.test.mjs tests/renderer_runtime_state_behavior.test.mjs tests/city_lights_asset_contract.test.mjs` 通过，`26 tests / 0 fail`。
- `python -m unittest tests.test_global_transport_builder_contracts -q` 通过，`Ran 55 tests / OK`。旧 failure 根因是 test 仍在断言 `data_loader.js` 中的硬编码 transport 路径字面量；当前 runtime 已改走 `resolveDataAssetUrl("transport_catalog:*")` 与 `resolveDataAssetUrl("context_layer:*")`。
- `npm run test:e2e:ui-rework-support` 通过，`13 passed (4.6m)`；后台日志位于：
  - `.runtime/tmp/ui_rework_support_20260505_100306.out.log`
  - `.runtime/tmp/ui_rework_support_20260505_100306.err.log`
- `bash ops/browser-mcp/run-smoke-browser-inspection.sh --mode quick` 通过：
  - report: `.runtime/reports/generated/browser/ai-browser-mcp-smoketest.md`
  - screenshots:
    - `.runtime/browser/mcp-artifacts/screenshots/route-home-quick-20260505-100836.png`
    - `.runtime/browser/mcp-artifacts/screenshots/gesture-map_pan_zoom-quick-20260505-100836.png`
    - `.runtime/browser/mcp-artifacts/screenshots/section-left_sidebar-quick-20260505-100836.png`
    - `.runtime/browser/mcp-artifacts/screenshots/section-map_container-quick-20260505-100836.png`
    - `.runtime/browser/mcp-artifacts/screenshots/section-right_sidebar-quick-20260505-100836.png`
  - console summary: no warning/error lines matched
  - network summary: no 4xx/5xx lines matched
- 当前判断：appearance + transport 主线收口完成，旧 `color-library-improvement` 与 `transport-panel-visibility` 已满足转 archive 条件。
- 已执行 archive：`docs/archive/color-library-improvement/`、`docs/archive/transport-panel-visibility/`。
- `python -m unittest tests.test_state_write_guardrail_contract -q` 通过，`Ran 5 tests / OK`。
- `init_map_data.py` 的 `hierarchy_locales` stage 下沉已完成：
  - 新增 `map_builder/hierarchy_locale_stage.py`
  - `init_map_data.py` 的 `run_hierarchy_locale_stage`、`run_geo_alias_normalization`、`run_optional_machine_translation` 已改为兼容 wrapper
  - `map_builder/contracts.py` 中 `hierarchy_locales` stage owner 改为新 owner，公开 manifest owner 继续保持 `init_map_data.hierarchy_locales`
  - `python -m py_compile init_map_data.py map_builder/hierarchy_locale_stage.py map_builder/contracts.py tests/test_build_orchestrator.py` 通过
  - `python -m unittest tests.test_build_orchestrator -q` 通过，`Ran 19 tests / OK`

## 2026-05-05 backlog finish

- state allowlist 第三批 ratchet 已完成：
  - `js/ui/scenario_controls.js` 改用 `registerRuntimeHook(state, "updateScenarioUIFn", renderScenarioControls)`
  - `js/core/scenario/pure_helpers.js` 改走 `recordScenarioPerfMetricState`
  - `js/core/scenario_post_apply_effects.js` 改走 `setScenarioPerfMetricState`
  - `js/core/state/scenario_runtime_state.js` 新增 `ensureScenarioPerfMetricsState`、`setScenarioPerfMetricState`、`recordScenarioPerfMetricState`
  - allowlist 从 `80 tracked files` 收口到 `77 tracked files`
- `js/core/renderer/transport_overview_render_owner.js` 的 `styleConfig.transportOverview` 归一化写口已改走 `ensureTransportOverviewStyleConfigState(runtimeState)`，state guardrail blocker 已清除。
- `map_renderer.js` owner extraction 继续推进：
  - 新增 `js/core/renderer/river_layer_render_owner.js`
  - `map_renderer.js` 仅保留 river wrapper、owner getter 和 `drawContextBasePass` 编排
  - `tests/river_layer_contracts.test.mjs` 已切到 owner + thin wrapper 合同

## 2026-05-05 final verification

- `node --check js/ui/scenario_controls.js js/core/scenario/pure_helpers.js js/core/scenario_post_apply_effects.js js/core/state/scenario_runtime_state.js js/core/state/ui_state.js js/core/renderer/transport_overview_render_owner.js js/core/map_renderer.js js/core/renderer/river_layer_render_owner.js` 通过。
- `node --test tests/scenario_runtime_state_behavior.test.mjs tests/scenario_pure_helpers.node.test.mjs` 通过，`8 tests / 0 fail`。
- `python -m unittest tests.test_scenario_resources_boundary_contract tests.test_state_write_guardrail_contract tests.test_transport_facility_interactions_contract tests.test_global_transport_builder_contracts -q` 通过，`Ran 85 tests / OK`。
- `npm run verify:state-write-allowlist` 通过，`State write allowlist passed with 77 tracked files.`。
- `npm run test:node:river-layer-contracts` 通过，`2 tests / 0 fail`。
- `lsp_diagnostics` 复查以下文件全部 `diagnosticCount: 0`：
  - `js/ui/scenario_controls.js`
  - `js/core/scenario/pure_helpers.js`
  - `js/core/scenario_post_apply_effects.js`
  - `js/core/state/scenario_runtime_state.js`
  - `js/core/state/ui_state.js`
  - `js/core/renderer/transport_overview_render_owner.js`
  - `js/core/map_renderer.js`
  - `js/core/renderer/river_layer_render_owner.js`
- `git diff --check` 通过；仅有 LF/CRLF warning，无 whitespace error。

## 2026-05-05 归档判定

- 当前主任务 checklist 已全部完成。
- live browser、Playwright、Python、Node、state guardrail、owner extraction 定向合同全部有新鲜证据。
- 当前目录满足移入 `docs/archive/appearance-transport-platformization/` 的条件。

## 2026-05-11 追加收口

- 恢复现场时发现当前运行态仍指向 appearance + transport 平台化，但实际工作区混有 TNO 数据、data-layer audit、special zone editor 等多条线；本轮只推进 platformization 相关的 state guardrail 与 transport manifest contract。
- 修复 special zone workbench / render owner 新增直接 state 写口：
  - `js/core/special_zone_layers.js` 新增 runtime state helper。
  - `js/core/renderer/special_zone_layers_render_owner.js` 改用 `ensureSpecialZoneLayersState`。
  - `js/ui/toolbar/special_zones_workbench_controller.js` 改用 special zone helper 写状态和注册 hook。
- `npm run verify:state-write-allowlist` 通过，allowlist 从 `77 tracked files` 继续收紧到 `73 tracked files`。
- 子代理静态复核发现 transport manifest validator 两个缺口：`bool` 被 Python 当成 `int`，以及 carrier 豁免只看 `family`。本轮已修复：
  - `map_builder/transport_workbench_contracts.py` 排除 boolean count。
  - carrier 豁免只认 `family == "carrier"` 且 `geometry_kind == "carrier"`。
  - `tests/test_transport_manifest_contracts.py` 增加 boolean count 与 carrier family/geometry mismatch 用例。
- 本轮验证：
  - `node --check js/core/special_zone_layers.js js/core/renderer/special_zone_layers_render_owner.js js/ui/toolbar/special_zones_workbench_controller.js js/core/map_renderer.js` 通过。
  - `python -m unittest tests.test_transport_manifest_contracts -q` 通过，`Ran 10 tests / OK`。
  - `python tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport-manifest-contracts-20260511.json` 通过，75 个 checked-in manifest 全部 `OK`。
  - `python -m unittest tests.test_transport_manifest_contracts tests.test_toolbar_split_boundary_contract tests.test_map_renderer_special_zone_layers_render_owner_boundary_contract -q` 通过，`Ran 46 tests / OK`。
  - `node --test tests/special_zone_layers_state_behavior.test.mjs` 通过，`5 tests / 0 fail`。
  - `npm run verify:state-write-allowlist` 通过，`State write allowlist passed with 73 tracked files.`。

