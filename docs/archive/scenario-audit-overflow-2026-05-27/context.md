# 剧本审计文本溢出修复上下文

## 2026-05-27
- 用户指出右侧栏诊断区 `div#scenarioAuditPanel` 文本横向溢出。
- 当前面板由 `js/ui/sidebar/project_support_diagnostics_controller.js` 创建，关键检查列表里的长 region id 与 `SKIPPED` 状态在窄面板中共用普通 flex 行。
- Browser 插件连接可用，但访问 `http://localhost:8000` 被安全策略拦截；本任务用源码定位、静态合同和 targeted tests 验证。
- live process owner: 主代理负责所有检查；无后台长测试。
- 已将审计指标行和关键检查行迁到 `scenario-audit-*` scoped class；CSS 现在使用两列网格、`overflow-wrap:anywhere`、9ch 状态列和面板级 `overflow:hidden` 控制横向溢出。
- 验证通过：`node --check` 相关 source/dist JS，`node --test tests/project_support_diagnostics_controller_behavior.test.mjs`，`python -m unittest tests.test_project_support_diagnostics_sidebar_boundary_contract -q`，manifest 校验，`git diff --check`。
- 已完成留档归档，进入提交推送阶段。
