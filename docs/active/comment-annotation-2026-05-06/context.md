# 上下文

## 2026-05-06

- 任务目标是“扫描近期更改过的代码库和提交文件，为重要文件、长文件和长期存在文件添加必要中文注释”。
- 结合近两周提交记录和文件体量，优先锁定 `chunk_runtime`、`bundle_loader`、`toolbar`、`file_manager` 四个核心长文件。
- 注释策略保持最小改动：只解释职责边界、交易阶段、兼容入口和状态同步语义，不给显而易见的赋值语句加注释。
- 子代理补充指出 `water_special_region_controller.js` 是近期高频改动且状态语义容易看反的文件，因此主线程额外补了该文件的 scope/bindEvents 注释。
- 验证采用 `node --check` 对 5 个 JavaScript 文件做语法检查，并手工清理了 comment-only 补丁触发的 CRLF 换行噪音。
