# Context

2026-05-03 开始执行。本轮任务目标是扫描近期改动热点与长期核心文件，为仍然偏难懂的关键 owner 文件补充必要中文注释，提升维护性与解读性，不改行为。

已确认：
- automation memory 显示 2026-04-29、2026-04-30、2026-05-01 三轮已经补过 `main`、`scenario_manager`、`sidebar`、`transport_workbench_controller`、`startup_data_pipeline`、`startup_hydration`、`file_manager` 等入口/壳层文件。
- 近 21 天热点里，`js/core/map_renderer.js`、`js/core/scenario_resources.js`、`js/core/scenario/chunk_runtime.js` 仍然同时满足“频繁改动、跨模块调度、容易误解时序”。
- 当前边界仍然是“只加必要注释，不改运行时行为，不扩散到低价值短文件”。

本轮策略：
- `map_renderer.js`：补 render phase、scenario water/special layer cache 策略、deferred exact refresh、staged warmup 语义。
- `scenario_resources.js`：补 optional layer 单一映射表、chunk/startup/bundle controller wiring 边界、optional layer eager/on-demand 约束。
- `chunk_runtime.js`：补 promotion 单拥有者、refresh 状态码、infra/visual 两段提交与 stale rollback 约束。

执行记录：
- 2026-05-03：读取 automation memory、`lessons learned.md`、旧归档与近期 git 热点；派出两条只读子代理做候选筛选，其中一条已明确建议以上 3 个目标文件。
- 2026-05-03：在 `js/core/map_renderer.js` 补充 render phase 三段时序、scenario water/special overlay 显式缓存策略、deferred exact refresh idle 限制、staged map data warmup 目标说明。
- 2026-05-03：在 `js/core/scenario_resources.js` 补充 scenario runtime 聚合门面职责、optional layer 单一映射表、chunk runtime 反向 wiring 边界、bundle runtime 与 facade 的职责分层。
- 2026-05-03：在 `js/core/scenario/chunk_runtime.js` 补充 promotion timer 与真正 commit owner 的关系、refresh 返回状态语义、infra/visual 两段提交及 stale 验证约束。
- 2026-05-03：发现一次 CRLF 换行漂移，已在收尾时统一恢复为 LF，最终 diff 只保留注释增量。

验证记录：
- `node --check js/core/map_renderer.js`
- `node --check js/core/scenario_resources.js`
- `node --check js/core/scenario/chunk_runtime.js`

自检结论：
- 本轮只增加中文注释，没有改动运行时行为。
- 注释保持在职责边界、关键时序、状态约束三类高价值信息，没有扩散成逐行讲解。
- 已额外核查换行风格，避免整文件重写噪音污染 diff。
