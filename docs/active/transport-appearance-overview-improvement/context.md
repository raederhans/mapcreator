# transport appearance overview context

- 2026-05-12：新上下文接手。当前工作树存在大量无关 TNO/data/docs 改动，本轮只做 path-limited 修改。
- Live process owner：主线程。子代理只做只读定位、测试建议、scope guard 和最终 review。
- `omx explore` 在 Windows POSIX allowlist wrapper 上不可用，已按项目记忆切回本地 grep/read 路线。
- Baseline 和 browser/test 产物统一放 `.runtime/`。
- 已生成 `.runtime/reports/generated/transport-overview-baseline.json`：确认 `global_rail=25`、`global_road=39`，并记录 manifest asset exists、audit class buckets、workbench/class-field drift。
- Renderer 改动集中在 `transport_overview_render_owner.js`：road/rail 改为 casing + inner stroke，regional rail 与 trunk road 使用 dash；dash 在 `finally` 中清空。
- UI 改动集中在 `appearance_controls_controller.js`：summary 读取 `runtimeState.renderPerfMetrics.contextBreakdown`，filtered count 只作为 loaded 辅助文本。
- Review 修复：i18n diff 已收窄到 UI copy；line contract 测试已从源码正则改为 fake canvas 行为测试；transport summary 变更改为 render 后刷新，并在 async layer load settle 后再刷新一次。

- Final reviewer flagged empty async catches in transport toggle summary refresh. Replaced them with diagnostic warning handlers that still refresh the summary after failed layer loads.

- Restored the transport visual mode handler's explicit renderDirty call so existing UI support contract continues to recognize the visual-mode wiring while keeping the post-render summary refresh.

- Review follow-up: restored audit/manifest summary mismatch as a strict publish blocker in tools/patch_tno_1962_bundle.py; transport summary now treats hidden metrics as settling and refreshes after master-toggle data load promises settle.
