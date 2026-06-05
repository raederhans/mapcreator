## 进度记录

- 发现旧图例由 `map_renderer.js` 在 `svg#map-svg` 中创建 `g.legend-group` 绘制，且 `pointer-events` 关闭，导致图例跟主地图绑定，无法单独拖动、关闭或选择。
- 改动方案：保留 `LegendManager` 的颜色和标签数据来源，把展示层改为 `#mapLegendControl` HTML 浮动控件。
- 已完成：`map_renderer` 生成 HTML 浮动控件，标题栏拖动，按钮收起和关闭；`project_support_diagnostics_controller` 在重新生成图例时显示控件。
- 验证：语法检查、图例生成行为测试、静态契约测试、`verify:pages-dist` 均通过。
- 本阶段目标：在既有 `#mapLegendControl` 上增加可持久化的宽度、高度和透明度；缩放由图例边缘触发，透明度条在边缘选中时显示。
- 当前 owner：主代理负责源码修改、测试运行和 dist 同步；未启动共享 live process。
- 完成：修复审查发现的缩放锚点漂移，收起态改用紧凑宽度，鼠标进入边缘即可显示透明度条；源码和 `dist/app` 已同步。
- 验证：`node --check` 两个源码文件和两个 dist 文件、图例行为测试、渲染器静态契约测试、`npm run verify:pages-dist`、`git diff --check` 均通过。
