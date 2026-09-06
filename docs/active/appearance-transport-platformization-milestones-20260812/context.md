# Appearance / Transport Platformization Context

## Current truth

- 2026-09-05 起，B1 Appearance、B2 UI/Transport、B3 Strategic/Special-Zone 的实现与正式 admission 统一见 [P4 当前状态](../state-action-ownership-p4-20260719/task.md#current-status)；本文件不维护另一份“尚未开始”或“已准入”结论。
- 当前局部治理的 writer、进度和交接由 [development-loop 记录](../development-loop-simplification-20260905/context.md) 维护。下方 A 准入、进程与 Git 清洁状态只证明对应历史候选，不代表当前工作区、远端或共享进程状态。

## 2026-09-04 Stage A handoff snapshot (historical)

以下保留当时的 A 交接摘要，其中 B 尚未开始的描述已被上述 P4 当前状态取代。

- 2026-09-04 Stage A 已正式准入：`A_ADMITTED_SHA=5fff7388d6246fa3bfb6c92a33d9ae5535a8af66`，tree `ba969a24a4730072245c60efeefba66409f2c88d`；验收前后 tracked/index 均 clean。
- 当前 integration checkout：`C:\Users\raede\Desktop\dev\mapcreator`，branch `codex/runtime-architecture-reset-r1-integration-20260831`；docs-only 状态提交只记录 marker，不替代 A source identity。
- exact P4.3、zero-gap route、Pages/dist、core 93/93、browser quick、standard perf 与 independent review 均绑定 `5fff7388` 并通过；perf artifact 位于 `.runtime/output/perf/baseline_2026-07-30/gate/perf-gate-current.json`。
- A-specific delta 的起点仍为包含 Gate 1 Export correctness hotfix 的 pre-A functional baseline `1e6ff40fa1f21f7dec9c6f68306adf6bb20dea08`；schema 3 baseline 与 P4.3 policy checkpoint 已纳入 admission evidence。
- B1 Appearance、B2 UI/Transport、B3 Strategic/Special-Zone 已解除 A 依赖但尚未开始；`B_ADMITTED_SHA` pending，C 仍 blocked on B。

## Decisions and deviations

以下为 2026-08-12 至 2026-08-15 的原始决策记录；日期内的“当前”“B 建立 actions”等措辞保留历史语境。

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-08-12 | A 使用 frozen source candidate `bc900b7f80901d96c22deeceda6492fdfcb14b1f` | 所有新增修复和验证相对该 SHA 报告；主监督负责形成正式 candidate SHA。 |
| 2026-08-12 | SF-ATS pre-edit dry-run 映射到 `perf`、`state-ownership`、`test-routing` | child-safe checks 按 selector 执行；三个新 coordination docs 属于允许的 non-production unmatched records。 |
| 2026-08-12 | baseline 数值必须由 canonical command 产生 | 当前执行者不改写测量值；主监督取得 perf lane 后生成 schema 3 JSON/Markdown。 |
| 2026-08-12 | B 只读取 A 的 `A_ADMITTED_SHA`，C 只读取 B 的 `B_ADMITTED_SHA` | 防止分叉候选或局部门禁结果越级成为下一里程碑基线。 |
| 2026-08-12 | 一次性 delegated P4.3 policy generator fail closed 于 renderer cache diagnostics 参数遍历 | 修复范围收敛到 `isShareableDiagnosticValue` 的 read-only cycle traversal，并增加 scanner regression；后续 generator lane 等待主监督重新授权。 |
| 2026-08-12 | 第二次 delegated generator 证明 6 个 exact-refresh/cache action binding diagnostics 无法准入 | 共同根因是有限 action 通过动态字段名 helper 写 state；改为固定 key production 表达，并增加 policy binding regression，保持所有 allowlist 与 action surface 不变。 |
| 2026-08-12 | 第三次 delegated generator 证明 `map_renderer.js` runtime-state escape fingerprint 为 actual 34、frozen/previous allowance 31 | 当前 scanner 的 commit replay 为 `27 → 32 → 34`；修复三个 P4.3 source-owned escape 后单模块 probe 为 31，保留 canonical ensure sink 和现有 action surface。该 fingerprint 是 multiset count，无法可靠标识 32 中具体哪四处由兼容 headroom 覆盖。 |
| 2026-08-13 | 主监督生成 schema 3 baseline，并修复 JSON round-trip 后的 CPU evidence drift | baseline 与 gate 使用同一持久化精度；raw runs、stored roles 与 recomputed role summary 由 validator 逐层绑定。 |
| 2026-08-13 | 独立 B review 对 architecture-clean candidate 提出 1 个 P1、4 个 P2 | 主监督在 `21bfb35aeaa18ba1b35723f2f1972ce2e07a7f92` 关闭 accepted findings；Pages dist、SF-ATS route、focused contracts 与 architecture boundary 已重新验证。 |
| 2026-08-13 | Final source review 发现 scenario summary canonical median 仍可脱离 raw runs，且 diagnostics missing-holder failure path 需要双写预检 | 主监督停止 obsolete-source generator，policy 文件保持原样；`2ee6653f812febd69148f659b5baee7fe1e3edf8` 绑定 recomputed median、补齐原子预检与 atomic writer order regression。 |
| 2026-08-15 | Gate 0–4 integrated work、A 前结构修复与 Gate 1 Export correctness hotfix 已进入 main lineage；`1e6ff40f` 固定为 pre-A functional baseline | Gate 1 的 `index.html`、`css/style.css`、`js/ui/toolbar.js` 变更作为 inherited upstream content；pure artifact model、detached scalar repair 与 zero/null/default/fail-fast facade hotfix 将 toolbar 保持在 3098/3100，并消除 imported helper 的 full-state alias edge。targeted scanner 相对 accepted baseline 的 finding multiset delta/missing 均为空；A-specific delta 对三条共享路径保持零变化。 |
| 2026-08-15 | Appearance / Transport change-set seam 以 dormant contract 进入 integrated baseline | 三个 contract/operation 模块保持零 runtime writer、零 UI wiring、零 Apply bridge/history persistence；B 建立 actions，C 完成 wiring、lifecycle 与产品准入。 |
| 2026-08-15 | Export Artifact Pipeline 在 A 前完成补偿性回退 | `78989887` 与 `7dce59d2` 恢复 P4.4-before-A ownership 边界；B actions 准入后按职责重放 pipeline。 |
| 2026-08-15 | Export artifact deterministic projections 迁入纯 model，zero/null/default 与 facade correctness 在 pre-A functional baseline 收口 | `1e6ff40f` 保持 DOM、runtime mutation、bake cache 与下载副作用在既有 owners；helper 输入为 detached scalar；显式 zero 保留为 0，null/undefined/blank 恢复为 100；facade 在 controller 创建前 fail-fast、创建后绑定 owner getter；toolbar structural contract 保持 54/54 green。 |

## Live process ownership

以下为 2026-08-12 至 2026-09-04 的 A 阶段进程与验收记录，不是当前 live-process 清单。

| Process | Owner | Command / cwd / outputs | State |
| --- | --- | --- | --- |
| A P4.3 policy checkpoint generator | 本 A task delegated owner | `node tools/build_state_writer_policy.mjs --phase P4.3 --write`；cwd `C:\Users\raede\.codex\worktrees\ded1\mapcreator`；PID `99112`，parent PID `211148`；目标输出 `tools/state_writer_policy.json` | released；start `2026-08-12 21:37:27 +08:00`；exit 1；observed elapsed约 `460.4s`；文件长度/mtime 保持 `10035935` bytes / `21:30:38`。失败为 `state-action-non-target-parameter-mutation`，三处 `diagnostics` alias escape。 |
| A P4.3 Python boundary | 本 A task delegated owner | `npm run -s test:python:p4:p4-3-boundary`；cwd `C:\Users\raede\.codex\worktrees\ded1\mapcreator`；top npm PID `486768`，Python PID `437852`，内部 checker PID `285336`；stdout 无落盘路径 | released；start `2026-08-12T21:51:55.9752602+08:00`；完整进程树于 `22:08:17 +08:00` 前自然退出；stdout/exit status 本地 bounded recovery 后仍不可可靠恢复，登记 `UNKNOWN_WITH_PROCESS_EXIT_EVIDENCE`；已知持续区间 `697.9s–981.2s`，保持零重跑。 |
| A P4.3 policy checkpoint generator rerun 2 | 本 A task delegated owner | `node tools/build_state_writer_policy.mjs --phase P4.3 --write`；cwd `C:\Users\raede\.codex\worktrees\ded1\mapcreator`；session `64956`；PID `549824`；目标输出 `tools/state_writer_policy.json` | released；start `2026-08-12T22:10:23.7217551+08:00`；exit 1；observed elapsed `463.991s`；policy 保持 `10035935` bytes / `2026-08-12T21:30:38.0930911+08:00`。失败为 6 个 `state-action-policy-binding-diagnostics-invalid`，exact-refresh 4 个 action 各 2，cache 2 个 action 各 4。 |
| A P4.3 policy checkpoint generator rerun 3 | 本 A task delegated owner | `node tools/build_state_writer_policy.mjs --phase P4.3 --write`；cwd `C:\Users\raede\.codex\worktrees\ded1\mapcreator`；session `7335`；PID `296772`；目标输出 `tools/state_writer_policy.json` | released；start `2026-08-12T22:28:14.6858992+08:00`；exit 1；进程最后存活与首次确认退出给出耗时区间 `778.6s–816.2s`；初始及最终 policy 均为 `10035935` bytes / `2026-08-12T21:30:38.0930911+08:00`。失败为 `legacy-semantic-authority-added`，frozen-baseline 与 previous-active 均报告 runtime-state escape actual 34、allowed 31。 |
| A P4.3 policy checkpoint generator rerun 4 | 本 A task delegated owner | `node tools/build_state_writer_policy.mjs --phase P4.3 --write`；cwd `C:\Users\raede\.codex\worktrees\ded1\mapcreator`；session `34106`；PID `545204`；目标输出 `tools/state_writer_policy.json` | released；start `2026-08-12T23:05:30.5058206+08:00`；end `2026-08-12T23:19:09.3111791+08:00`；exit 0；elapsed `818.805s`；policy 从 `10035935` bytes / `2026-08-12T21:30:38.0930911+08:00` 更新为 `10928785` bytes / `2026-08-12T23:19:09.2651010+08:00`。写入 207 writers；短读取契约与 exact route gate 均通过。 |
| A exact `7319193e` review checkpoint generator | 本 A task delegated owner | 同一 canonical generator command；session `82779`，PID `468364` | released；start `2026-08-13T00:12:25.1501860+08:00`；end `2026-08-13T00:28:56.3897097+08:00`；exit 0；elapsed `991.240s`；207 writers；checkpoint commit `b66ebeaa700054a01129783a5ba956705e152d3d`。 |
| A review-fix P4.3 generator at `08b470d9` | A task delegated owner，主监督授权 | canonical generator；PID `115400`；输出 `tools/state_writer_policy.json` | released as obsolete source；start `2026-08-13T01:09:50.9445305+08:00`；stop `2026-08-13T01:20:33.0443086+08:00`；duration `642.100s`；wrapper exit `-1`；policy length/mtime 均保持 `10928785` bytes / `2026-08-13T00:28:56.3113068+08:00`。 |
| A final review-fix P4.3 generator | `/root` main supervisor | `node tools/build_state_writer_policy.mjs --phase P4.3 --write`；输出 `tools/state_writer_policy.json` | completed，exit 0；写入 207 writers；checkpoint commit `dac80102a1c8bfbdf9a479e9a6866b6211afef90`。 |
| A post-structural P4.3 generator | `/root` main supervisor | 同一 canonical generator；输入为 `1e6ff40f` pre-A functional baseline 与当前 clean Gate A candidate | completed，exit 0；207 writers；schema 2、latestPhase P4.3、唯一 P4.3 checkpoint；六项 P4.3 legacy metrics 与六组 retired authority counts 逐项不变；policy 与 coordination evidence 由当前 Gate A candidate 承载。 |
| A canonical perf baseline generation | `/root` main supervisor | `npm run perf:baseline`；输入 `tno_1962,hoi4_1939`、runs `5`、warmups `3` | completed，exit 0；schema 3、admitted environment、stable generation fence、两场景各 5 个 canonical samples；commit `727108824362e373ee9cf6ba5abb04829aed4f04`。 |
| A standard perf gate | `/root` main supervisor | `npm run -s perf:gate`；cwd 为 clean `5fff7388`；输出 `.runtime/output/perf/baseline_2026-07-30/gate/` | completed / PASS；exit 0、environment admitted、generation fence stable、10 measured runs、enforced failures 0；`perf-gate-current.json` SHA-256 `2B9503D78DD45050DB7FB13392D29DA9593F00CD36F2C9E58CEDEC1BB0119DAD`。 |
| A browser / Playwright | `/root` main supervisor | quick profile；report `.runtime/reports/generated/browser/ai-browser-mcp-smoketest.md` | completed / PASS；left/right sidebar、map container 与 pan/zoom 均覆盖，无 skip，console warning/error 0，network 4xx/5xx 0。 |
| A Pages/dist and core main-thread | `/root` main supervisor | exact source candidate 的 Pages/dist 与 `.runtime/reports/generated/verify-core.json` | completed / PASS；core 93/93，source/dist 与 exact identity 契约通过。 |
| A independent review | independent verifier，主监督收口 | exact Git range 与 A admission artifact | completed / PASS；原唯一 P1 canonical-route 缺口已在 `5fff7388` 关闭，无 material finding。 |

## Handoff

以下保留 A 阶段的历史交接约束；已实现工作不会因这份记录被重新派发，后续正式准入仍由主监督确认候选和证据。

- A execution owner 的 `ready-for-supervisor-validation` 包与主监督 live gates/review 已收口；正式 source marker 为 `A_ADMITTED_SHA=5fff7388d6246fa3bfb6c92a33d9ae5535a8af66`。
- B 只能从正式 `A_ADMITTED_SHA` 建立 clean replay worktree；P4.4 recovery lineage 只作为职责级补丁来源。
- C 只能从正式 `B_ADMITTED_SHA` 建立产品里程碑 worktree。

## Next step

按 [P4 当前状态](../state-action-ownership-p4-20260719/task.md#current-status) 和主任务当前分工继续工作，不再自动创建历史 B1/B2/B3 重放任务。正式 B admission 开始时，由主监督确认候选血缘及缺失 gate；C 仍以正式 B marker 为前置条件。
