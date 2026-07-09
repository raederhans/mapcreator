# Verification metadata

`tools/verification/verification_domains.mjs` 是验证命令归属的主来源。它记录每个验证入口的 `commandRef`、source refs、domain、owner、layer、cost、resource locks、execution owner、CI profile，以及它是否进入 `verify:core` 默认组、main-thread 组、optional E2E 列表或 route registry。

## 消费方

- `tools/run_core_verification.mjs` 从 metadata 生成 `verify:core` 默认分组、main-thread E2E 分组和 optional E2E skip 列表。
- `tools/test_route_registry.mjs` 从 metadata 生成验证工具相关的 infra routes，并继续动态生成 E2E、Node 和 Python routes。
- `tools/select_verification_targets.mjs` 把 `tools/verification/**` 和这份文档映射到 `test-routing`，避免 metadata 改动出现 route gap。
- `tests/verification_metadata_behavior.test.mjs` 检查 metadata、route registry、verify:core plan、selector 推荐之间的一致性。

## 修改规则

修改 `verify:core` 命令归属时，先改 `tools/verification/verification_domains.mjs`。如果新命令是 package script，需要同时在 `package.json` 中提供命名入口。若命令需要 browser、dev server、dist、scenario data 或 `.runtime` 输出锁，在 metadata 里声明对应 resource lock 和 execution owner。

新增验证 metadata 文件、测试或文档时，同步更新 `infra:verification-metadata` 的 `sourceRefs`，并运行：

- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- `node tools/select_verification_targets.mjs --check`
- `npm run verify:core:list`
