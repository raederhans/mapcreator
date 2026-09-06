# Verification metadata

验证命令归属只有一套 canonical 定义，手工记录按职责放在 `tools/verification/catalog/`。`tools/verification/verification_catalog_source.mjs` 是公开聚合入口，负责组合、规范化和冻结，保留原有导出；消费者继续从该入口读取 metadata。`tools/verification/verification_catalog_projection.mjs` 从中生成 canonical records 和 routes；`tools/verification/verification_domains.mjs` 只保留 canonical 投影与入口策略计算，不再维护 legacy 定义。

## 编辑导航

修改已有入口，先按 record ID、`commandRef` 或源文件路径搜索，例如 `rg -n -F 'test:node:renderer-viewport-update-owner' tools/verification/catalog`。同一命令可能有 selector、verify-core 和局部反馈等不同记录，且可能分处不同文件；检查全部匹配，再修改本次涉及的归属。

以下路径均相对于 `tools/verification/catalog/`：

| 修改内容 | 编辑位置 |
| --- | --- |
| npm 命令文本 | `package_scripts.mjs`，并同步实际 `package.json` |
| 入口策略、core 分组、成本与 gate 策略、CI 投影配置、supersession | `policies.mjs` |
| 场景、启动、城市、UI 工作台、状态所有权、测试路由 | `records/` 下对应的 `scenario`、`startup`、`city`、`ui_workbench`、`state_ownership`、`test_routing` 文件 |
| 数据契约；发布、性能、浏览器治理等记录 | `records/data_contracts.mjs`；`records/delivery_runtime.mjs` |
| 渲染记录 | `records/renderer_*.mjs`：`cache_pipeline` 管缓存与 pass；`frame_orchestration` 管帧合成；`interaction` 管命中、悬停和交互；`projection_viewport` 管投影与视口；`surface_state` 管 surface、事务与生命周期；`layers` 管图层；`ui_bootstrap` 管 UI owner 与启动接线 |
| action、owner 和独立测试的局部反馈路由 | `records/local_feedback.mjs` |
| 新增、删除或重命名 catalog 模块 | `source_files.mjs` 的精确路径清单，以及公开入口的导入与组合 |

`normalization.mjs` 是规范化、校验及身份摘要算法，`gate_policy_signals.mjs` 是 gate 信号计算；它们不存放验证命令记录。gate 计算由公开入口显式传入 authority，内部模块不要反向导入聚合入口。投影、route registry 和历史快照也不是新增记录的位置。

`source_files.mjs` 只列源文件，不复制业务记录；路由归属、P4 共享工具归属和历史输入集合共用此清单。新增模块应补入清单，而不是在各消费者另抄一份路径表。

## 消费方

普通实现优先使用已有的 `verify:edit` / `verify:commit`；`verify:core` 默认仅保留明确标为 child-safe、无资源锁且非 heavy 的命令。完整策略证明、场景全包与 dist 检查仍可通过 `verify:core:main-thread` 显式执行；`verify:nightly` 使用 `--include-reserved` 保留原来的非浏览器完整集合，Nightly Linux shards 也从该集合分片。

P4.4 的 13 个 action 和 border mesh/draw owner 有直接指向现有 behavior suite 的本地路由。局部反馈不要求先生成 exact-SHA 历史策略证据；深层验证仍记录为 deferred，不等同于正式 phase admission。可先预览 `node tools/run_adaptive_tests.mjs --entrypoint edit --defer-main-thread --changed-file js/core/state/actions/appearance_actions.js`，再添加 `--execute` 运行。同一次修改不需要再手动重复对应的叶测试。未提交修改使用 `edit`；`impact` 仍要求历史 base 和干净工作区，不接受显式 `--changed-file`，不能用来绕过 `edit` 的预算限制。

海洋渲染、视口更新、悬停交互、城市灯光和 project support diagnostics owner 也有直接行为测试路由。范围仅限已列明的 owner 与测试文件，不扩展到整个 renderer/sidebar 或数据资产。诊断 controller 测试使用内存 DOM、文件和 fetch 替身，不启动服务或访问真实网络。

`tools/run_commit_verification.mjs` 的局部反馈只运行 `tests/verify_commit_runner_behavior.test.mjs`；`test:node:verify-core-runner`、local-infra 和控制面测试组合仍包含拆分后的 core 与 commit 两组测试。

HOI4 catalog helper 对应 `unit_counter_catalog_behavior.test.mjs`，不扩展为整个事件绑定 helper 或 sidebar 的覆盖。`retired_frontline_behavior.test.mjs` 可独立运行，也保留在完整 renderer-splits 组合中；它不代表整个 renderer 根文件已验证。局部投影只匹配明确声明的文件或目录，不因同属一个 domain 而扩大范围。

- `tools/run_core_verification.mjs` 从 canonical metadata projection 生成 `verify:core` 默认分组、main-thread E2E 分组和 optional E2E skip 列表。
- `tools/test_route_registry.mjs` 从 canonical route projection 读取全部路由；独立读取实际 package scripts、E2E manifest 和 Python heavy groups 检查缺失的命令路由。
- `tools/select_verification_targets.mjs` 把 `tools/verification/**` 和这份文档映射到 `test-routing`，避免 metadata 改动出现 route gap。
- `tests/verification_metadata_behavior.test.mjs` 检查 metadata、route registry、verify:core plan、selector 推荐之间的一致性。
- `test:node:verification-metadata` 只运行当前 metadata 测试；`test:node:catalog-projection-history` 单独运行历史投影与 receipt 契约。后者不属于默认 core 或 local-infra；修改历史实现时仍由其精确路由选中。
- `tools/verification/verification_catalog_projection.mjs` 还生成 heavy dependency groups、package aliases、PR profile IDs、Nightly jobs/shards/final dependencies 与 documentation refs。这里只投影能够和现有 legacy surface 逐项机械比较的字段；未被 legacy 表达的推断不会伪装成 shadow 证据。
- `tools/verification/catalog_projection_legacy.mjs` 仅供历史迁移 receipt 使用：读取实际 JSON、package scripts 和 workflows，以及 `catalog_projection_historical_baseline.json` 中冻结的旧 documentation/supersession 快照。它不进入日常 portfolio 检查，快照不能随当前 metadata 改动同步更新。

## 修改规则

修改验证命令归属时，编辑上述对应 records 文件；不要在聚合入口末尾追加补丁式记录。新 package script 在 `package_scripts.mjs` 和对应 record 中同时声明，并保持实际 `package.json` 一致。无需同步 legacy domains/routes；普通 `check` 已退役双轨比较。若命令需要 browser、dev server、dist、scenario data 或 `.runtime` 输出锁，在 canonical record 中声明对应 resource lock 和 execution owner。

保留记录的 `verificationOrder`、`selectorOrder` 和 `entrypointPolicyIndex` 含义；移动文件不应改变执行顺序或入口资格。`policies.mjs` 的 `entrypointPolicies` 数组位置被记录直接引用，不能只为排版重排。局部路由由 `createLocalFeedbackRecords(baseRecords)` 在基础记录最大 selector order 之后按明确分组生成；新增时检查其后各组的偏移，不要靠聚合入口的 import 顺序推断优先级。该文件暂保留三条历史增补的 `python-package:*` 深层记录，它们仍为 `heavy` / `full` / `main-thread`，文件名不代表它们可进入快速局部执行。

新增验证 metadata 文件、测试或文档时，同步对应 canonical record 的 `sourceRefs`。按变更运行相关目标测试，以及 `node tools/select_verification_targets.mjs --check`；该入口同时检查 schema 和从实际文件发现的路由覆盖。`npm run verify:script-portfolio` 继续检查实际 package、命令展开、supersession 覆盖和 catalog 一致性。无需默认运行完整 core 或 metadata 大套件。

## 历史迁移证据

新旧 domain、route 聚合与 supersession 的重复手写定义已退役，portfolio 的 `shadow-check` 子命令也已移除。普通开发只维护 canonical source。

`catalog_projection_shadow_cli.mjs` 及迁移 ledger 的旧 receipt 格式暂时保留供历史审计，其十次连续记录规则不再是日常修改或本次定义退役的前置条件。冻结快照只表达退役时的旧投影；当前 metadata 变化导致历史比较不同，是基线变化，不应通过更新快照掩盖。旧 receipt 的 `legacyRetained` 仅涉及这份历史投影快照，不表示完整旧路由系统仍存在。Pages/dist 和发布验证规则未在本次改动中改变。

Supervisor 保留 dossier、lane 选择、逐命令 checkpoint 和报告，进程执行由 `executeAdaptivePlan` 统一完成。其显式 main-thread/CI 选择及 `--continue-on-failure` 语义保持；普通 adaptive 调用仍默认遇到失败即停止。这是执行实现复用，Supervisor 没有改用 adaptive 的 catalog-bound leaf planner，不能将其报告作为该 planner 的绑定证据。
