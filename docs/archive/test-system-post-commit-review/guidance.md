# Guidance

## Scope
- 评估近期测试系统相关提交，重点看 selector / route registry / adaptive runner / shared boot fixture / E2E wrapper。
- 以 live code 为准，旧计划只作背景。
- 先找真实逻辑漏洞、冗余、非最佳实现，再做真实命令压力验证。

## Seed evidence
- 相关提交：`eeef59d`（测试薄层）、`5b48562`（测试改进），必要时向前追到 smoke / adaptive 相关提交。
- 背景文档：`docs/active/test-system-structural-improvement/*`、`docs/archive/test-system-routing-overhaul/*`。
- 当前目标：判断 coding agent 是否能可靠理解并调用现有测试结构。
