# context

2026-05-29: 用户指出外观-运输里的“运输视觉模式”（分布/网络/覆盖范围）可能没有和下方 Airport/Port/Rail/Road 图层设置联动，并提出更合理的方向：需要联动时应分别启用图层效果，个别图层如有不同设置则给予覆盖权限。当前 live server 为主线程独占：`http://127.0.0.1:8810/app/`。

2026-05-29: 审计结果：`transportVisualMode` 写入 `runtimeState.styleConfig.transportOverview.visualMode`，summary 通过 `buildTransportFamilySummaryText` 传入 `visualMode` 重新计算过滤数量，renderer 在 Airport/Port/Rail/Road 四条绘制路径中把同一个 `visualMode` 传入 point/line strategy。当前是全局联动，没有 per-family visual mode override。由于现有链路没有断开，本轮不改代码；推荐后续如需更细控制，采用“全局默认 + 每个 family 可切换 manual override”的模型。
