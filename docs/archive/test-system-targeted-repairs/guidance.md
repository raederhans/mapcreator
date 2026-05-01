# Guidance

## Scope
- 修复近期测试系统评估里已经确认的真实问题。
- 以 live code 为准，review 与 archive 文档只作指导材料。
- 主线程独占所有 live Playwright / 长测试；子代理只做静态分析与 targeted review。

## Confirmed problems
1. `tools/run_adaptive_tests.mjs` 默认 changed-file discover 混入 `origin/main...HEAD` 和 `HEAD^ HEAD`，范围失真。
2. `tools/run_adaptive_tests.mjs` 解析 git path 输出时会吃到 quoted / non-normalized 路径。
3. `tools/test_route_registry.mjs` 漏挂大量 `test:node:*`，selector 无法命中现成 targeted node tests。
4. `tests/e2e/support/fixtures.js` 自动 `failure-context` 在 reset 之后采集，失败现场被覆盖。
5. E2E route 元数据是 per-spec，命令却是 domain-level，导致成本和实际执行范围失真。
6. workflow / helper / dev-spec explain 仍有路由空洞。
7. `verify-shared.yml` 先重建 import graph 再校验 stale，CI gate 失效。

## Acceptance criteria
- `test:adaptive` 默认行为只覆盖明确的当前改动来源，并且路径解析稳定。
- selector 能为 `startup_hydration.js`、`lifecycle_runtime.js`、`playwright-app.js`、`pr-verify.yml`、`tests/e2e/dev/tno_ready_state_contract.dev.spec.js` 提供合理推荐。
- E2E spec route 推荐改为精确 spec 级命令，避免单 spec 变更自动拉整 domain。
- shared fixture 失败时先保留失败现场，再做 cleanup。
- `verify-shared.yml` 的 import graph stale check 恢复真实约束。
- 相关 targeted tests 与 static checks 全部通过。
