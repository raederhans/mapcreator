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

2026-05-07 执行结果：
- `special_zones_workbench_controller.js` 现在以当前图层为入口：无图层时成员和样式/preset 都显示禁用说明；新建图层后才出现成员工具、样式和 preset。
- 成员区工具压缩为 single / multi / brush 三个 icon；brush 有 add/remove 子模式。single 在地图点击时替换当前成员集合，multi 点击切换，brush 按 add/remove 连续写入。
- 成员批量边界收窄到 current tile、dev selection、parent group；移除 country / owner 输入入口，parent group 通过 renderer 的 `resolveSpecialZoneParentGroupTargetIdsFn` 解析，没有国家级退化。
- preset 改为矩形预览卡，点击直接更新当前图层样式并保留成员。
- 已补 state、toolbar contract 和 focused Playwright 回归。
- 自检修复：场景 asset 首次保存需要真实加载成功；dev hover/selection 会刷新成员按钮；手动样式编辑后 preset 标记回到 custom；E2E 改为按 preset 名称点击。

2026-05-07 review follow-up：
- 复核 reviewer 指出的 hover 路径：`updateDevHoverHit()` 每次 mousemove 都通过 `notifyDevWorkspace()` 间接重建 special zone workbench。
- 修复目标：dev hover 只刷新 current tile / parent group 这一小块成员目标按钮；full workbench 继续只在图层、样式、成员集合或 dev selection 实际变化时刷新。
- 验证目标：JS 语法检查、toolbar split contract、renderer-splits node tests。
