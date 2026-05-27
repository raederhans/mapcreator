# 特殊区域图层工作台样式修复计划

## 目标
- 让特殊区域图层工作台与左侧栏现有卡片、按钮、标题和提示文字风格一致。
- 保持 `special_zones_workbench_controller.js` 的状态与交互职责不变，优先用样式修复。
- 同步 `dist/app` 交付面并跑针对性检查。

## 步骤
- [x] 定位现有 DOM 和 CSS 来源。
- [x] 修复工作台根容器、卡片、按钮、输入控件和空态样式。
- [x] 补充静态 UI contract，防止按钮样式回退成默认浏览器样式。
- [x] 同步 `dist/app` 并校验 manifest。
- [x] 运行 targeted tests 与 diff 检查。
- [x] 完成后归档本任务留档。
