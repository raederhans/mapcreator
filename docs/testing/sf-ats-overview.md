# SF-ATS 概览

SF-ATS 的全称是 Scenario Forge Adaptive Test Supervisor。它是仓库里的验证合同，用来把一次代码改动整理成清晰的验证计划、领域摘要，以及后续 agent 和 CI 都能复用的稳定证据。

Work Package 1 只处理文档、schema、registry 和静态校验。它不改生产 JavaScript runtime 行为、Playwright 行为、CI workflow 行为、自适应 selector 行为，也不改 route registry 行为。

## 为什么 Scenario Forge 需要它

Scenario Forge 现在有很多验证通道：纯 Node contract、Python contract、Playwright smoke test、scenario-data 检查、Pages dist 检查、perf gate，还有重型地理数据测试。这些通道的 owner、资源占用和运行成本都不一样。SF-ATS 给 agent 一套统一词汇，用来描述 domain、安全检查、lane ownership 和证据，这样一个小 UI 改动、一个 scenario-data 改动、一个测试基础设施改动，都能拿到合适的验证范围。

第一原则很简单：coding agent 在宣告完成前，要先识别受影响的 domain，选择确定性检查，保留产物，并报告验证缺口。

## 它复用的现有工具

SF-ATS 复用了当前测试基础设施：

- `tools/run_adaptive_tests.mjs` 发现改动文件，生成 adaptive dry-run report，也能执行 child-safe 检查。
- `tools/select_verification_targets.mjs` 把改动文件映射到 route 建议、未匹配文件、受影响 domain 和 main-thread 串行检查。
- `tools/test_route_registry.mjs` 是当前 route registry，里面有 domain、owner 提示、资源锁、执行 owner、成本、layer 和 CI profile。
- `tools/e2e_layering.mjs` 校验并运行 Playwright E2E layer。
- `tests/e2e/test-layer-manifest.json` 是 Playwright layer 和 domain manifest。
- Playwright timing 与 failure-context reporter 会写入 timing summary 和 failure context artifact。
- `.github/workflows/verify-shared.yml` 会在 CI profile 里运行 selector explain、route check、fast contract、E2E layer check、smoke E2E、Pages dist check 和 artifact upload。

## 预期的五阶段架构

1. Work Package 1: Agent Contract and Domain Registry.
2. Work Package 2: Change Dossier and Supervised Plan.
3. Work Package 3: Evidence Store and Failure Context Expansion.
4. Work Package 4: Domain Invariants and Adversarial Regression Seeds.
5. Work Package 5: CI Integration, Regression Ledger, and Governance.

## 检查通道

Child-safe checks 是确定性的静态、Node 或 Python 检查，不会占用 browser、dev server、dist writer、重型地理资源、scenario-data writer 或 `.runtime` 输出锁。

Main-thread checks 需要一个明确的单 owner，因为它们会使用 browser、Playwright、dev server、dist output、scenario-data output、perf runner、重型地理资源或共享 `.runtime` 输出。

CI-only checks 依赖 CI 环境、service token、已部署的 Pages URL 或 matrix 上下文，本地 agent 应把它们记录为待补的 CI 证据。

Heavy checks 是高成本检查，可能属于 main-thread，也可能属于 CI-only，因为它们会触及 Playwright、perf、dist、scenario-data、重型地理依赖、checkpoint builder 或大规模数据扫描。

## 初始领域分类

初始 registry 覆盖必需的 SF-ATS domain，以及当前 route registry 和 E2E manifest 已声明的 domain：

- `test-routing`
- `playwright-observability`
- `architecture-boundaries`
- `renderer-runtime`
- `scenario-runtime`
- `startup`
- `main-shell`
- `ui-shell`
- `city-runtime`
- `map-layer`
- `water-runtime`
- `tno-water`
- `tno-startup`
- `transport-workbench`
- `project-io`
- `strategic-overlay`
- `data-governance`
- `backend-cloud-support`
- `pages-dist`
- `perf`
- `i18n-data`
- `browser-smoke`
- `dev-workspace`
- `geo-contract`
- `hoi4-scenario`
- `review-workspace`
- `scenario-build`
- `scenario-contracts`
- `scenario-shell`
- `shell-interaction`
- `shortcut-history`
- `sidebar-shell`
- `texture-overlay`
- `tno-coverage-chain`
- `tno-scenario`
- `ui-foundation`
- `ui-rework`
- `palette-runtime`

每个 domain 都会记录 owner 提示、常见 source glob、优先 child-safe 检查、优先 main-thread 检查、风险信号、证据产物和回归预期。

## 未来 agent 的使用方式

未来的 coding agent 应该：

1. 在编辑前列出改动文件，并把它们映射到 SF-ATS domain。
2. 运行 `npm run test:adaptive` 或 `node tools/run_adaptive_tests.mjs --changed-files ...`，生成 dry-run 选择报告。
3. 在 route registry schema 本身需要校验时，运行 `node tools/select_verification_targets.mjs --check`。
4. 使用 `tools/ai_test_supervisor/domain_registry.json` 区分 child-safe checks 和 main-thread checks。
5. 运行与受影响 domain 对应的 child-safe checks。
6. 在运行 Playwright、browser、perf、dist、scenario-data、heavy-geo 或 `.runtime` 输出锁定类检查前，先确定唯一 owner。
7. 保存或报告 selector、supervisor validation、tests、traces、screenshots、failure-context files、runtime counters、scenario contract reports、generated supervisor reports 或 CI 产出的结构化证据。
8. 为真实 bug fix 新增或更新 regression coverage。
9. 报告改动文件、命令、退出状态、artifacts、跳过的检查、main-thread 或 CI-only 检查、route gaps、regression coverage 和剩余风险。

## Work Package 1 边界

Work Package 1 只创建合同表面：

- 根目录 `AGENTS.md` 中的 SF-ATS 指令
- 本概览文档
- `tools/ai_test_supervisor/domain_registry.json`
- 面向后续工作包的三个 JSON schema
- 一个无依赖的结构校验器
- registry 和 schema contract 的 Node 测试
- 这些静态检查对应的 package script

Runtime supervisor、selector 行为改动、CI workflow 改动、新 E2E 测试、LLM API 调用和 evidence store 实现，都属于后续工作包。

## Work Package 2 用法

Work Package 2 增加 deterministic supervisor 层。它把 changed files 和 selector 输出整理成 change dossier、supervisor plan、Markdown plan，并且可以只执行 child-safe checks。

默认 dry-run：

```bash
node tools/ai_test_supervisor/supervise_adaptive_verification.mjs
```

显式指定文件：

```bash
node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file AGENTS.md
node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-files tools/ai_test_supervisor/build_change_dossier.mjs,tests/supervisor_plan_behavior.test.mjs
```

执行 child-safe checks：

```bash
node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --execute
```

包含 main-thread checks：

```bash
node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --execute --include-main-thread
```

main-thread checks 默认进入 `blockedCommands`。只有在明确拥有 browser、Playwright、perf、dist、scenario-data、heavy-geo 或 `.runtime` 输出锁时，才使用 `--include-main-thread`。

CI-only checks 默认进入 `blockedCommands`。需要本地临时纳入时使用 `--include-ci-only`，否则把它们记录为 CI 证据缺口。

严格阻塞模式：

```bash
node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --strict-blocked
```

当 plan 里仍有 blocked commands 时，严格阻塞模式会在写出 artifacts 后返回 exit code 2。

默认 artifacts：

- `.runtime/reports/generated/supervisor-change-dossier.json`
- `.runtime/reports/generated/supervisor-plan.json`
- `.runtime/reports/generated/supervisor-plan.md`

固定 package scripts：

- `npm run test:node:supervisor-plan`
- `npm run test:supervisor`
- `npm run test:supervisor:execute`
- `npm run test:supervisor:execute:main-thread`
- `npm run verify:supervisor-plan`
