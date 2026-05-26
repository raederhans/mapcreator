# Startup Fill Render Regression Context

## 2026-05-20

- 用户报告：启动首屏出现绿地貌图，关闭 Appearance 上下文图层的地貌区后国家填色恢复。
- 用户报告：填色交互无论选择哪个色板颜色，实际表现都偏深紫。
- 用户报告：填色后会短暂黑屏。
- 当前 live process owner：主线程。日志路径暂未建立。
- 静态子代理：
  - Herschel：地貌/physical layer 与 political pass 顺序。
  - Copernicus：色板到 fill interaction 的颜色链。
  - Galileo：填色后 dirty signal、cache 和黑屏路径。

## Current Repository State

- 工作树已有 appearance/transport 平台化相关未提交改动，包含 `js/core/map_renderer.js`、`js/ui/toolbar.js`、`js/ui/toolbar/appearance_controls_controller.js`、`js/ui/toolbar/transport_workbench_controller.js`。
- 本轮会把这些改动当作当前事实读取，不做回滚。

## Root Cause Notes

- `drawContextBasePass` 里继续绘制 `drawPhysicalReliefOverlayLayer`；它位于 political 之后，所以地貌图层默认开启时会把国家色压暗或压绿。
- detail/full hydration 后，active scenario 的 runtime-only `shell_fallback + render_as_base_geography:false` 可能进入政治底图路径，导致 `scenarioPoliticalChunkData` 和 political base 被 shell 污染。
- 旧逻辑把 shell-only political payload 归一为 `null` 后，又回退到旧 `state.scenarioPoliticalChunkData`，会把旧 chunk 继续带进渲染。
- 填色颜色链在真实页面 smoke 中选择 `#648abe` 后写入并解析回 `#648abe`；颜色错乱主要来自底图/状态污染后的视觉结果。

## Patch Notes

- `drawPhysicalBasePass` 现在同时绘制 semantic atlas 和 relief overlay，让地貌填充保持在 political 下层。
- `drawContextBasePass` 移除 relief overlay，只保留 contours、urban、rivers 这类上下文线/面层。
- `tests/physical_layer_contracts.test.mjs` 更新为保护新的层级合同：physical fill underlay 先于 political，contextBase 不再绘制 relief overlay。
- `rebuildPoliticalLandCollections` 在 non-blank 模式下会先过滤 runtime-only shell fallback，再决定 runtime political collection 是否能作为底图。
- `startup_hydration` 现在用 payload decision 区分“没有 payload”和“明确收到 shell-only payload”；后者会清空旧 `scenarioPoliticalChunkData`。
- `deferred_detail_promotion` 不再让 active scenario 的 detail promotion 覆盖 `scenarioRuntimeTopologyData` / default topology 权威源。
- `tests/startup_hydration_behavior.test.mjs` 增加旧 `scenarioPoliticalChunkData` 污染回归和 mixed political payload 回归，`tests/scenario_chunk_contracts.test.mjs` 和 Python boundary contract 同步锁住新边界。
- 最终 cleanup pass 把测试里的大段实现快照收紧成点状合同，避免后续等价重构被误杀。

## Verification Notes

- `node --check js/core/map_renderer.js` 通过。
- `node --check js/core/scenario/startup_hydration.js` 通过。
- `node --check js/bootstrap/deferred_detail_promotion.js` 通过。
- `node --test tests/physical_layer_contracts.test.mjs` 通过；其中顺手把 physical toggle 合同指向当前 owner 文件 `appearance_physical_owner.js`。
- `node --test tests/startup_hydration_behavior.test.mjs` 通过，11 个测试。
- `node --test tests/scenario_chunk_contracts.test.mjs` 通过，29 个测试。
- `node --test tests/palette_runtime_bridge.node.test.mjs` 通过，覆盖 color state / resolver / palette bridge。
- `python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_startup_hydration_boundary_contract -q` 通过，10 个测试。
- `.runtime/tmp/startup-fill-render-regression-smoke.mjs` 通过，截图写入 `.runtime/browser/mcp-artifacts/startup-fill-render-regression/`。
- smoke 关键值：填色目标 `AD`，选择色 `#648abe`，解析色 `#648abe`；`ready/afterFill/physicalLoaded/physicalOff.blackFrameCount = 0`。
- full physical 加载后：`scenarioPoliticalChunkDataCount = 0`，`landDataFullFeatures = 22569`，`drawScenarioPoliticalBackgroundEntries.entryCount = 22547`。
- full physical 加载后：`drawPhysicalBasePass.renderedCount = 1848`，`semanticRenderedCount = 1465`，`reliefRenderedCount = 383`；说明地貌填充已经在 physicalBase 下层绘制。
- 第一轮静态 reviewer 找到两个 shell fallback 边界问题，已修复并补测试。
- 最终 code-reviewer 复核为 APPROVE，architect 复核为 CLEAR，cleanup gate 复核为 PASS。
- 最终 review / cleanup 复核结果记录在 `.runtime/reports/generated/startup-fill-render-regression-quality-gate.json`。
