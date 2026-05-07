# Context

2026-05-07：任务从 brainstorming / visual mockup 进入执行。用户确认方向：
- 拓展内容边界，同时精简 UI 复杂性。
- 成员编辑必须先选择图层；无图层时成员与样式禁用。
- 成员选择只做当前地块和上级分组，不做国家级。
- 没有上级分组时只选当前地块。
- 点击切换成员；多选即时写入；刷选分加入刷和移除刷。
- 样式模板使用矩形预览卡，点击即应用当前图层。
- 当前图层样式逐项编辑当前图层。

初始证据：
- `special_zones_workbench_controller.js` 已是 special zone layer UI owner。
- `map_renderer.js` 已有 `special-zone-membership` 点击/拖动路径和 parent-group 解析函数。
- `special_zone_layers.js` 已使用显式 `memberFeatureIds`。

执行约束：
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 串行集成。
- 主线程独占 live tests。
