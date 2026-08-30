# Verification metadata

`tools/verification/verification_catalog_source.mjs` 是验证命令归属的唯一手工事实源。它记录 package scripts、每个验证入口的 `commandRef`、source refs、domain、owner、layer、cost、resource locks、execution owner、CI profile、entrypoint policy 与 supersession。`tools/verification/verification_catalog_projection.mjs` 从该来源生成 canonical records 和 routes；`tools/verification/verification_domains.mjs` 只保留兼容投影与 legacy shadow，不是第二份事实源。

## 消费方

- `tools/run_core_verification.mjs` 从 canonical metadata projection 生成 `verify:core` 默认分组、main-thread E2E 分组和 optional E2E skip 列表。
- `tools/test_route_registry.mjs` 从 canonical route projection 生成验证工具相关的 infra routes，并继续动态生成 E2E、Node 和 Python routes。
- `tools/select_verification_targets.mjs` 把 `tools/verification/**` 和这份文档映射到 `test-routing`，避免 metadata 改动出现 route gap。
- `tests/verification_metadata_behavior.test.mjs` 检查 metadata、route registry、verify:core plan、selector 推荐之间的一致性。
- `tools/verification/verification_catalog_projection.mjs` 还生成 heavy dependency groups、package aliases、PR profile IDs、Nightly jobs/shards/final dependencies 与 documentation refs。这里只投影能够和现有 legacy surface 逐项机械比较的字段；未被 legacy 表达的推断不会伪装成 shadow 证据。
- `tools/verification/catalog_projection_legacy.mjs` 零进程读取 retained legacy JSON、package scripts、workflows 和 legacy domains，并由 `catalog_projection_shadow.mjs` 比较五个固定 projection。comparison 与 receipt 都绑定同一个 canonical source identity。

## 修改规则

修改验证命令归属时，只编辑 `tools/verification/verification_catalog_source.mjs`。如果新命令是 package script，在该 source 的 `packageScripts` 与对应 record 中同时声明；`package.json`、legacy domains/routes 与其他 projection 必须通过机械 shadow equivalence，不能独立成为 authority。若命令需要 browser、dev server、dist、scenario data 或 `.runtime` 输出锁，在 canonical record 中声明对应 resource lock 和 execution owner。

新增验证 metadata 文件、测试或文档时，同步更新 `infra:verification-metadata` 的 `sourceRefs`，并运行：

- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- `node tools/select_verification_targets.mjs --check`
- `npm run verify:core:list`

## Legacy retirement shadow

提交后的 clean worktree 可运行 `node tools/verification/catalog_projection_shadow_cli.mjs` 写入本地 `.runtime/reports/generated/catalog-projection-shadow/receipt.json`。只有同一 canonical source identity 连续十次全绿才会得到 `retirementEligible: true`；任何 projection 漂移或 identity 变化都会重置计数。该标志只证明具备人工评估 legacy retirement 的资格，receipt 始终保留 `legacyRetained: true`，不会自动删除 legacy surface。
