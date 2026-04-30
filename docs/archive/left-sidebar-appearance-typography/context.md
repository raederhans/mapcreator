# Context

2026-04-30：用户要求延续右侧检查器的字体秩序感到左侧剧本/外观相关面板。当前任务重点是视觉层级、删冗余内容、重新分配空间。共享文件包括 `index.html`、`css/style.css`、`tests/test_ui_rework_plan03_support_transport_contract.py`、`tests/e2e/ui_rework_support_transport_hardening.spec.js`；最终验证由主线程独占执行。

执行记录：
- 剧本面板保留 `#scenarioStatus` 与 `#scenarioAuditHint` 作为运行时/测试锚点，并改成 `visually-hidden`，可见高度压到 1px。
- 外观-上下文图层删除搜索输入；现有 JS 对空选择器已有保护，`applyAppearanceFilter` 以空查询继续显示全部层。
- 外观-纹理删除二级标题、帮助按钮和说明文本，`Overlay` 成为直接控制标题。
- 左侧栏增加局部字体 token，统一海洋、边界、纹理、特殊区域编辑器、颜色库的 section/card/control/meta 层级。
- 颜色库行补齐 block/overflow 约束，避免标题和副标题在窄栏中横向溢出。
- 浏览器截图复核显示网络失败 0；控制台仍有项目既有数据/预加载 warning。
