# Quickbar 移除当前所选按钮上下文

## 2026-05-28
- 用户要求在底部 quickbar 的“使用选择标签”上方新增“移除当前所选”按钮，并复用开发工具已有移除所选代码。
- 已读 `lessons learned.md`：UI 改动要锁真实可见行为，静态合同要锁 owner 面，`dist/app` 同步要控制范围。
- 已读 `frontend-testing-debugging` skill：当前 Browser 路径优先，但本项目此前访问 localhost 会被策略阻断；如仍阻断，本轮用 targeted tests 和源码合同验证。
- 已读 `ultrawork` skill：本任务写入面集中，保持本地主线执行，验收用轻量证据闭环。
- 预计相关文件：
  - `js/ui/dev_workspace/dev_workspace_shell_builder.js`
  - `js/ui/dev_workspace.js`
  - `js/ui/dev_workspace/selection_ownership_controller.js`
  - `css/style.css`
  - `tests/...`
  - `dist/app/...` 对应交付文件
- 已实现：quickbar 在“使用选择标签”上方新增 `devQuickRemoveSelectedBtn`，点击时代理现有 `devSelectionToggleSelectedBtn`。
- 行为约束：只有当前命中的 land feature 已存在于 `devSelectionFeatureIds` 且 `landIndex` 可解析时，quickbar 移除按钮才启用。
- 已补测试：`tests/dev_workspace_selection_ownership_behavior.test.mjs` 验证代理点击行为；Python 边界合同锁 source/dist controller 同步和 quickbar stacked layout。
- 验证已通过：JS `node --check`、`npm run -s test:node:dev-workspace-selection-ownership`、相关 Python unittest。
- 复核结论：子代理只读 review 未发现阻塞问题；CSS 整文件历史漂移是既有风险，本轮只锁当前 quickbar 片段。
