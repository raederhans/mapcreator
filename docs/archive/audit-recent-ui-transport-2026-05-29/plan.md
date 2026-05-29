# 最近 UI/transport 提交审计计划

## 目标
- 审核 `HEAD~10..HEAD` 中时间和功能相近的 UI、transport、quickbar、support surface 改动。
- 修复已证实的功能漏洞、i18n 漏洞、结构漂移和测试缺口。
- 保持 source 与 `dist/app` 同步，避免提交 `.omx/metrics.json` 这类运行态噪声。

## 约束
- 主线程独占 live tests、browser smoke、构建和最终验证。
- 子代理只做静态审计，不运行 browser/dev server/长测试。
- `index.html`、`css/style.css`、`js/ui/toolbar.js` 由主线程串行集成。
- 当前工作区已有未提交改动，相关 i18n 修补可纳入本轮，`.omx/metrics.json` 保持不提交。

## 执行清单
- [x] 读取自动化记忆、仓库状态、`lessons learned.md`、相关 skill。
- [x] 确定审计范围为最近 10 个提交。
- [x] 静态审计 transport/sidebar/quickbar 相关 source 与 dist 漂移。
- [x] 修复已确认缺口并补充或收紧测试。
- [x] 同步 `dist/app` 与 `dist/pages-dist-manifest.json`。
- [x] 运行 targeted verification。
- [x] 最终 review-查 bug-第一性原理自检。
- [x] 提交并推送。
