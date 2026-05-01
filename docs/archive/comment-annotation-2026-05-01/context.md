# Context

2026-05-01 开始执行。本轮任务目标是扫描近期改动热点与长期核心文件，为仍然偏难懂的 owner 文件补充必要中文注释，提升维护性与可读性。

已确认：
- 2026-04-29 已补过 `js/core/map_renderer.js`、`js/core/scenario/chunk_runtime.js`、`js/ui/toolbar.js`。
- 2026-04-30 已补过 `js/core/data_loader.js`、`js/ui/sidebar/strategic_overlay_controller.js`、`js/ui/sidebar.js`，并在另一轮纠错里确认过 `js/main.js`、`js/core/scenario_manager.js`、`js/ui/toolbar/transport_workbench_controller.js` 已属于这条注释线。
- 当前边界仍然是“只加必要注释，不改行为，不扩散到低价值短文件”。

本轮策略：
- 优先处理 startup / scenario / import 这三条长期链路里仍然缺少边界说明的 owner 文件。
- 注释只解释职责分层、关键时序、状态收口和数据约束，不写逐行翻译。
- 避免绝对化措辞，尤其不把“主要职责”写成“唯一职责”。

当前候选：
- `js/bootstrap/startup_data_pipeline.js`
- `js/core/scenario/startup_hydration.js`
- `js/core/file_manager.js`

2026-05-01 实施记录：
- `js/bootstrap/startup_data_pipeline.js`：补充了 startup data owner 的职责边界、deferred context layer 统一调用面、startup bundle 与 legacy fallback 的双来源语义，以及 base payload 注入 state 的收口点说明。
- `js/core/scenario/startup_hydration.js`：补充了 runtime version tag 的真实用途、runtime topology 与 overlay version tag 的先后关系，以及 hydration health gate 的判定目标说明。
- `js/core/file_manager.js`：补充了 scenario import audit 的语义、manual special zone 导入预算裁剪原因，以及 import/export 作为 schema 归一化边界的职责说明。

2026-05-01 验证记录：
- `node --check js/bootstrap/startup_data_pipeline.js`
- `node --check js/core/scenario/startup_hydration.js`
- `node --check js/core/file_manager.js`

2026-05-01 自检结论：
- 本轮只增加中文注释，没有改动运行时行为。
- 期间出现过一次换行风格漂移，已恢复为仓库原本的 LF，最终 diff 仅保留注释增量。
- 注释仍然集中在职责边界、时序和归一化约束，没有向显而易见的细枝末节扩散。
