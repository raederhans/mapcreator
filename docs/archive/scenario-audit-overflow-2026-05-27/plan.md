# 剧本审计文本溢出修复计划

## 目标
- 修复右侧栏 `scenarioAuditPanel` 中长 region id、状态值和说明文本横向溢出。
- 保持剧本审计加载、诊断请求和数据结构不变，只调整 DOM 语义类与样式。
- 同步 `dist/app` 并补静态合同。

## 步骤
- [x] 定位审计面板 DOM 与 CSS 溢出来源。
- [x] 给审计指标行、关键检查行、详情 summary 和长文本增加专用类。
- [x] 用 scoped CSS 限制面板最大宽度、处理长词换行、省略和右侧状态宽度。
- [x] 同步 `dist/app` 与 manifest。
- [x] 运行 targeted tests、自检和格式检查。
- [x] 完成后归档留档。
