# Scenario Apply Transaction Ownership Stage 2 Plan

## 目标

修复 scenario apply 的事务所有权：同一 scenario 的重复 apply 复用当前 promise；不同 scenario 的 apply 进入 latest-request-wins 队列；旧 request 的异步回调在失去 currentness 后只记录 diagnostics 并退出。

## 范围

- `js/core/scenario_manager.js`
- `js/core/scenario_apply_pipeline.js`
- `js/core/scenario_post_apply_effects.js`
- `js/core/scenario/chunk_runtime.js`
- `js/core/scenario_resources.js`
- `js/core/renderer/render_transaction_diagnostics.js`
- focused scenario lifecycle/runtime/chunk/diagnostics tests
- affected `dist/app` mirrors and Pages manifest after source changes

## 非目标

- 颜色 fallback 策略
- Atlantropa layer 加载策略
- chunk selection 策略
- render budget hints
- worker / OffscreenCanvas / WebGL / vector tile defaults

## 验收标准

- A apply 中请求 B 时，B 进入 latest queued request，并在 A 收口后执行。
- A apply 中请求 B 后再请求 C 时，最终只提交 C。
- 同一 target 的重复 apply 继续复用 active promise。
- fatal recovery lock 生效时，queued request 停止 drain。
- stale post-frame、prewarm、optional layer sync、chunk promotion、payload commit、render refresh callback 记录 diagnostics 后退出。
- `__scenarioForgeRenderTransactions` 能显示 active target、requested target、queued target、request id、scenarioApplyEpoch 和最终 active scenario。
- focused Node tests、Pages dist 验证、diff check、运行时采样、ai-slop-cleaner、独立 code-review 双 lane 通过。

## 执行清单

- [x] 创建独立 worktree 和任务留档。
- [x] 建立 worktree 注册表基线。
- [x] 阅读指定源码和测试，定位 apply/currentness 写入点。
- [x] 实现 transaction ownership 与 queue drain。
- [x] 加固 stale callback fences 和 diagnostics。
- [x] 扩展 focused tests。
- [x] 同步 Pages dist。
- [x] 运行 targeted verification。
- [x] 采样浏览器或运行时 diagnostics。
- [x] 执行 final code-review gate。
- [ ] 提交、合并回 main、推送并清理 worktree。

## 验证计划

- `node --check js/core/scenario_manager.js`
- `node --check js/core/scenario_post_apply_effects.js`
- `node --check js/core/scenario/chunk_runtime.js`
- `node --check js/core/renderer/render_transaction_diagnostics.js`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-runtime-state-behavior`
- `npm run test:node:scenario-lifecycle-runtime-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `npm run verify:pages-dist`
- `git diff --check`
