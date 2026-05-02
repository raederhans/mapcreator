# appearance-transport-visual-audit context

- 任务开始：2026-05-01
- 目标：完成 appearance + transport 全量修复与平台化收口，让默认启动、主地图 overview、transport workbench、Apply bridge、视觉调参和测试口径一致。
- 约束：主线程独占 live browser / live test；子代理只做静态分析；共享文件 `index.html` / `css/style.css` / `js/ui/toolbar.js` 只做串行集成。
- 已完成主实现：
  1. 新增 `js/core/transport_capability_registry.js`，统一 family 顺序、overview/apply capability、visual mode、shared resolver 与 apply patch 逻辑。
  2. `state_defaults` / `ui_state` 接入 `transportOverview.visualMode`、region-ready workbench state、label separation `0.7..1.8` 合同。
  3. `appearance_controls_controller` 接入 transport visual mode，并把 family toggle 语义收口成“family toggle 可单独拉起 master，其他子控件跟随 master disabled”。
  4. `transport_workbench_controller` 接入 render generation guard、async apply、runtime family registry、capability-driven compare/apply copy，并修复 open-state stale object bug。
  5. `transport_workbench_family_preview` / `point_preview_shared` / `road_preview` / `rail_preview` 在异步阶段增加 generation currentness 校验。
  6. startup 默认链静默 deferred detail / physical atlas / opening owner border 的预期未就绪信号，默认打开 `tno_1962` 不再带误导性 warning 进入。
  7. ocean / day-night / texture 默认参数完成一轮减灰与可读性调参。
  8. transport runtime copy 与 startup locale 收口到 capability-driven 口径，清掉 road-only / seven-family / raw snake_case 文案残留。
- 关键根因：
  - transport workbench 打不开的根因是 `ensureTransportWorkbenchUiState()` 每次替换整个 `transportWorkbenchUi` 对象，导致 `setTransportWorkbenchState(true)` 先拿旧引用、再在 `resetTransportWorkbenchSectionState()` 里把对象换掉，最后把 `open=true` 写回旧对象。
  - 修法：保留 `transportWorkbenchUi` 顶层对象 identity，并在 open-state 落地前回读当前对象。
- 关键验证：
  - Python unittest：`Ran 113 tests in 0.754s`，`OK`
  - Node contracts：`20/20 passed`
  - `node tools/e2e_layering.mjs check`：passed
  - Playwright 全量目标集：21 条通过
    - `tests/e2e/ui_rework_support_transport_hardening.spec.js`
    - `tests/e2e/dev/tno_ready_state_contract.dev.spec.js`
    - `tests/e2e/transport_workbench_port_coverage_tiers.spec.js`
    - `tests/e2e/transport_workbench_industrial_variants.spec.js`
    - `tests/e2e/transport_workbench_label_rotation.spec.js`
- reviewer follow-up：
  1. `Apply to Main Map` 现在先过 `getTransportWorkbenchOverviewBridgeSupport()`，road / rail 固定关闭，airport / port 只有在 filter 集合能被主地图 overview 无损表达时才允许 Apply。
  2. `resolveTransportOverviewPatchFromWorkbench()` 只返回主地图 overview 真正消费的字段，preview-only `displayConfig` 留在 workbench 本地。
  3. 额外收紧了默认分支：未来新增 `main_map_bridge` family 时，bridge support 默认关闭，必须显式声明映射规则后才会开放。
  4. 补了两层回归：静态合同钉住 gate 与 preview-only 语义；E2E 钉住 airport / port 的启用与禁用切换。
- reviewer follow-up 验证：
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_toolbar_split_boundary_contract tests.test_ui_rework_plan03_support_transport_contract`：`Ran 48 tests`，`OK`
  - `node --check js/core/transport_capability_registry.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/e2e/ui_rework_support_transport_hardening.spec.js`
  - `tests/e2e/ui_rework_support_transport_hardening.spec.js:569` 单条验证通过
  - clean Playwright 目标集再次通过：`21 passed (7.5m)`
- 当前状态：review follow-up 验证完成，任务已归档。
