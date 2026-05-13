# 外观面板运输图层改进计划

目标：把 Appearance 面板里的 transport road/rail overview 做成可见、可解释、可验证的主图 overlay，并补齐 road label 最小闭环。

执行边界：
- 只改主图 transport overview 渲染、Appearance summary 反馈、对应 i18n 和 targeted contract。
- 保持 `properties.class` 为 renderer 的 canonical class source。
- 本轮只消费 checked-in `global_road` / `global_rail`，不重建官方数据源，不改 transport workbench editor。
- Road labels 使用当前 road feature 的 `ref/name` 字段；`road_labels` sidecar 继续作为 Phase B 状态展示。
- 主线程独占 live tests/browser；子代理只做只读定位、测试建议和最终 review。

验收：
- `.runtime/reports/generated/transport-overview-baseline.json` 记录 `global_road=39`、`global_rail=25`、feature counts、class buckets、phase status、missing assets。
- `transport_overview_render_owner.js` 保留 road/rail casing + inner stroke、dash、screen-width floor；rail 支持 `mainline/regional/secondary`；road 支持 inline `ref/name` label 计数。
- `appearance_controls_controller.js` summary 继续以 renderer `contextBreakdown` 为 visible truth，并显示 loaded/visible、class coverage、source policy、phase 状态。
- Road label 控件进入 Appearance road card，i18n catalog/locales/baseline 同步。
- Targeted node/python contract 通过；主线程完成 browser smoke，产物放 `.runtime/browser/`。
