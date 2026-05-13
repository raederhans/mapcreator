# 外观面板运输图层改进计划

目标：把 Appearance 面板里的 transport road/rail overview 做成可见、可解释、可验证的主图 overlay。

执行边界：
- 只改主图 transport overview 渲染和 Appearance summary 反馈。
- 保持 `properties.class` 为 renderer 的 canonical class source。
- Road overview 继续声明 `roads`；rail 继续声明 `railways` 和 `rail_stations_major`。
- 本轮记录 country/workbench pack 的 `road_class` / `line_class` drift，只做事实留档。
- 本轮不接入 road_labels loader，不做 road label 渲染，不改 workbench editor，不重建 transport data。

验收：
- `.runtime/reports/generated/transport-overview-baseline.json` 记录 global_rail/global_road catalog、asset exists、class bucket、schema drift。
- `js/core/renderer/transport_overview_render_owner.js` 使用 road/rail casing + inner/dash 视觉表达，线宽有 screen floor，dash 状态每次绘制后清理。
- `js/ui/toolbar/appearance_controls_controller.js` 的 summary 主状态读取 renderer visible metrics，filtered count 只作辅助口径。
- 新文案进入 `js/ui/i18n_catalog.js`，同步 `data/locales.json` / `data/i18n/locales_baseline.json`。
- Targeted checks 通过，主线程独占 browser smoke。
