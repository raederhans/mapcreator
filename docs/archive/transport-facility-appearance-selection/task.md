# Transport Facility Appearance Selection

- 目标：改进外观面板 Transport 下机场/港口的标签、图标可见度和点击选择语义。
- 范围：机场/港口 overview 主图渲染、对应外观控件、点击/hover 对底层地块选择的隔离逻辑、现有 targeted tests。
- Live process owner：主线程独占所有测试、构建、browser smoke。子代理只读静态分析与 review。
- 共享文件：`index.html`、`css/style.css`、`js/ui/toolbar.js` 只由主线程串行集成。
