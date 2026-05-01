# Context

- 2026-05-01：开始针对近期测试系统提交做只读评估。
- 已读取 lessons learned、测试系统现有 plan/context、相关 memory 摘要。
- 主线程执行了真实命令：
  - `node tools/select_verification_targets.mjs --check`
  - `npm run verify:test:e2e-layers`
  - `python -m unittest tests.test_e2e_structural_tooling -q`
  - 多组 `node tools/select_verification_targets.mjs <path> --json`
  - `node tools/e2e_layering.mjs run-domain city-runtime -- --list`
- 并行子代理完成了 code-review、architect、QA 可操作性审计。
- 已确认的真实问题：
  1. `tools/run_adaptive_tests.mjs` 默认 changed-file discover 混入 `HEAD^..HEAD` 和 `origin/main...HEAD`，clean tree 也会选中上次提交。
  2. `tools/run_adaptive_tests.mjs` 直接解析 `git diff --name-only` 文本，遇到 quoted/non-ASCII 路径会生成畸形 changed file。
  3. `tools/test_route_registry.mjs` 只登记了部分 `test:node:*` 脚本，导致 `startup_hydration.js`、`lifecycle_runtime.js` 等变更漏掉现成 targeted node tests。
  4. `tests/e2e/support/fixtures.js` 在 reset 之后才自动写 `failure-context`，失败现场会被 cleanup 覆盖。
  5. `tools/test_route_registry.mjs` 用 per-spec route 元数据去描述 domain-level `run-domain` 命令，成本与范围口径失真。
  6. `tests/e2e/support/playwright-app.js` 这种共享 helper 会被 selector 放大成 23 条命令 / 22 条主线程验证，agent 很难精准 debug。
