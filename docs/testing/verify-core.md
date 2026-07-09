# verify:core

`verify:core` 是 Scenario Forge 的 non-browser deterministic core lane。它会按顺序运行一组 package script，并在遇到第一个失败项时停止。

## 命令

- `npm run verify:core:list`：只生成 JSON 和 Markdown 报告，不实际执行命令。
- `npm run verify:core`：运行默认的确定性核心验证计划。
- `npm run verify:core:main-thread`：在默认计划上追加显式的 main-thread E2E 组。
- `npm run test:node:verify-core-runner`：验证 runner 自身行为。
- `npm run test:node:verification-metadata`：验证 metadata、route registry、selector 和 verify:core plan 一致。

默认报告路径：

- `.runtime/reports/generated/verify-core.json`
- `.runtime/reports/generated/verify-core.md`

## 默认范围

默认计划覆盖这些分组：

- `infra`
- `python-quick`
- `startup-node`
- `renderer-owner`
- `scenario-project-chunk`
- `pages`

这些分组由 `tools/verification/verification_domains.mjs` 生成，`tools/run_core_verification.mjs` 只负责执行、报告和失败即停。修改命令归属时先更新 metadata，再运行 `npm run test:node:verification-metadata`。

默认范围是确定性的，不会启动 browser、dev server 或 Playwright。它覆盖 CLI/build 合同，并默认保留 `pages` 分组：

- `verify:pages-dist`
- `verify:dist-drift`

`pages` 分组会写入或检查 Pages mirror、dist manifest 和 `.runtime` 报告，所以运行 `verify:core` 时，integration owner 需要持有 dist lane。这个默认范围适合做 non-browser 核心安全线；它具备 dist / runtime-output 资源语义。

## Main-thread 通道

`verify:core:main-thread` 会追加这些显式 E2E 命令：

- `test:e2e:smoke`
- `test:e2e:scenario-apply-concurrency`
- `test:e2e:project-save-load`
- `test:e2e:interaction-funnel`

下面这些可选 E2E 命令会继续保留在“已跳过的 main-thread 检查”列表里，方便 integration owner 按需安排：

- `test:e2e:tno-contracts`
- `test:e2e:water-rendering`
- `test:e2e:city-rendering`

## 路由覆盖

SF-ATS route registry 会把 runner、runner 测试、package scripts 和这份文档都映射到 `test-routing`。如果改动涉及 `package.json`、`package-lock.json`、`tools/run_core_verification.mjs` 或 `docs/testing/verify-core.md`，selector 应该命中同一个 domain。

验证 metadata 自身的 route 信息也来自同一份 metadata。改动 `tools/verification/**` 或 `docs/testing/verification-metadata.md` 时，selector 应该命中 `test-routing`，并推荐 `test:node:verification-metadata`。

## 失败排查

`verify:core:list` 只产出 plan 和报告文件，不执行任何验证命令。`verify:core` 或 `verify:core:main-thread` 失败后，先查看：

- `.runtime/reports/generated/verify-core.json`
- `.runtime/reports/generated/verify-core.md`
- 第一个失败的 `failing commandRef`
- `verify:dist-drift` 的 dist drift 输出
- selector 或 supervisor 报告里的 route gaps

P0.1.1 后验收要求 full `npm run verify:core` 实际运行，并把通过结果或失败分类记录到 worktree registry。

## 有意跳过的项

`verify:core` 会过滤自递归命令，例如 `verify:core` 和 `node tools/run_core_verification.mjs`。缺失的 package script 会在报告里记为 omitted commands。重复的具体命令会只在 `duplicateCommands` 中记录一次。
