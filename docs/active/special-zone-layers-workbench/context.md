# Special Zone Layers Workbench Context

## 2026-05-05 start
- 用户要求按既有计划在 fresh context 中执行到全部目标完成。
- 主线程持有 live verification；子代理只做静态分析或独占文件补丁。
- `omx explore` 在 Windows allowlist runtime 下不可用，改用普通 shell / native subagents。
- 当前 git status 只有既有 `.omx/metrics.json` 修改，本任务应避免把它纳入实现成果。

## 约束
- 不创建新 worktree。
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 串行集成。
- 长测试只由主线程运行。

## 2026-05-05 Implementation checkpoint

- 建立 `specialZoneLayers` runtime state、preset registry、schema normalize、mutation/serialization 与 render feature bridge。
- file import/export、interaction funnel、history manager、scenario optional layer loader、manifest contract、checkpoint publish contract 和 dev server save endpoint 已接入。
- `special_zone_layers.json` 已为 checked-in scenarios 建立，manifest、build_snapshot、audit/startup bundle source 已同步。
- Special Zones workbench 复用原 `specialZonePopover`，新增图层列表、preset library、属性编辑、bulk actions、membership tool、scenario dev save。
- Legacy freehand draw 入口已停用，旧 panel 只保留提示与历史手动条目管理，避免继续写入 `manualSpecialZones` 主路径。
- Export workbench 增加 `special-zones` text layer，SVG annotation 导出会排除该 group，`special-zones` 作为独立 export source 绘制。
- Verification so far: `node --check` core/UI files, `py_compile` tools, `npm run test:node:special-zone-layers`, `python -m unittest tests.test_dev_server tests.test_scenario_contracts -q`, `python -m unittest tests.test_scenario_bundle_platform tests.test_startup_bootstrap_assets tests.test_scenario_chunk_assets -q`, `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_scenario_resources_boundary_contract -q`, strict scenario contract checks for tno_1962/hoi4_1936/hoi4_1939, non-strict checks for blank_base/modern_world.

## Final verification checkpoint - 2026-05-05 18:55:07 -04:00

- Fixed final review blockers: SVG pattern overlay now renders via per-layer `<pattern>` defs, country/owner bulk action uses runtime owner/country feature indexes, and scenario asset save now forces a review pass after first load.
- i18n audit final4: `ui_missing=0`, `ui_english_fallback=0`, `uncovered_visible_ui=0`, `a11y_literals=0`.
- Verification passed: `node --check` for changed JS/Python files, `npm run test:node:special-zone-layers`, 176 targeted Python tests with 1 expected skip, and scenario contracts for tno_1962 / hoi4_1936 / hoi4_1939 / blank_base / modern_world.
- Remaining plan deltas for the next implementation batch: true `topojson.merge()` merged-outline cache and zoom-updated pattern transforms still need a dedicated render-owner extraction; legacy `specialRegionOverrides` inspector code remains as compatibility surface while new project/scenario save/export paths use `specialZoneLayers`.

## Final rerun after save guard - 2026-05-05 19:00:00 -04:00

- After strengthening the scenario save guard, reran `node --check js/ui/toolbar/special_zones_workbench_controller.js`, i18n audit final5, `npm run test:node:special-zone-layers`, and the 176-test Python targeted suite. All passed with the known Node module-type warning and expected fixture/server-port noise.

## Hooke/Hilbert review follow-up - 2026-05-05 19:08:00 -04:00

- Removed the standalone `test:node:special-zone-layers` script and folded the new Node test into `test:node:renderer-splits`.
- Dropped legacy `specialRegionOverrides` from project export/import/application, and made map special-region brush/click editing selection-only so the new layer model is the save/export/edit main path.
- Repaired the two focused scenario chunk contracts found by Hilbert: `scenario-ownership-apply-owner-controller` render reason and `scenario_shell_controller_hint` renderer awareness.
- Final rerun passed: i18n final6, `npm run test:node:renderer-splits`, 176 Python targeted tests, strict scenario contracts for tno_1962 / hoi4_1936 / hoi4_1939, and `git diff --check`.

## Review blocker fix - 2026-05-05

- Fixed workbench scenario asset cache by replacing the boolean loaded flag with `loadedScenarioLayerAssetId`, so switching active scenarios forces the new scenario's `special_zone_layers.json` to load before save.
- Rebuilt `modern_world` build snapshot/audit/manifest with `check_scenario_contracts.py --strict --write-safe`, adding `special_zone_layers.json` to `input_sha` and updating the fingerprint.
- Verification: `node --check js/ui/toolbar/special_zones_workbench_controller.js`, `python -m unittest tests.test_toolbar_split_boundary_contract -q`, `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/modern_world`, and `git diff --check` all passed.
