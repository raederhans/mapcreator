# Appearance / Transport Platformization Context

## Current truth

- 2026-08-12 remote read-only check：`refs/heads/main=5461c24aa5e40c3ea184dfee84db10630a199cbc`。
- 当前独立 worktree：`C:\Users\raede\.codex\worktrees\ded1\mapcreator`，detached source review-fix commit `2ee6653f812febd69148f659b5baee7fe1e3edf8`，提交后 tracked/untracked 状态 clean。
- `merge-base(HEAD, origin/main)=5461c24aa5e40c3ea184dfee84db10630a199cbc`；source candidate 相对 `origin/main` 为 `0 behind / 21 ahead`。
- schema 3 baseline 已提交；checked-in policy 的 latestPhase 已为 P4.3。review-fix source 位于 checkpoint 之后，当前静态 blocker 为新的 exact generator checkpoint。
- 主 checkout 位于 `68a62e540104025e1b3e976f77589f8b3eff2f36`；本任务保持隔离，不读取其未归属 WIP 作为候选输入。
- 2026-08-15 主监督已将 Gate 0–4 integrated/pre-A baseline 固定为 `24794035204465922d201b068fdc66818aa9b5db`；A-specific delta 从该 SHA 起算；`dac80102` policy checkpoint 已被结构修复取代，新的 exact checkpoint pending。

## Decisions and deviations

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
| 2026-08-15 | Gate 0–4 integrated work 与 A 前结构修复已进入 main lineage；`24794035` 固定为 pre-A baseline | Gate 1 的 `index.html`、`css/style.css`、`js/ui/toolbar.js` 变更作为 inherited upstream content；pure artifact model 将 toolbar 从 3186 行收敛到 3073 行；A-specific delta 对三条共享路径保持零变化。 |
| 2026-08-15 | Appearance / Transport change-set seam 以 dormant contract 进入 integrated baseline | 三个 contract/operation 模块保持零 runtime writer、零 UI wiring、零 Apply bridge/history persistence；B 建立 actions，C 完成 wiring、lifecycle 与产品准入。 |
| 2026-08-15 | Export Artifact Pipeline 在 A 前完成补偿性回退 | `78989887` 与 `7dce59d2` 恢复 P4.4-before-A ownership 边界；B actions 准入后按职责重放 pipeline。 |
| 2026-08-15 | Export artifact deterministic projections 迁入纯 model | `24794035` 保持 DOM、runtime mutation、bake cache 与下载副作用在既有 owners；toolbar structural contract 恢复 54/54 green。 |

## Live process ownership

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
| A post-structural P4.3 generator | `/root` main supervisor | 同一 canonical generator；输入为 `24794035` structural baseline 及随后 Pages/coordination candidate | pending；生成后形成新的唯一 exact checkpoint。 |
| A canonical perf baseline generation | `/root` main supervisor | `npm run perf:baseline`；输入 `tno_1962,hoi4_1939`、runs `5`、warmups `3` | completed，exit 0；schema 3、admitted environment、stable generation fence、两场景各 5 个 canonical samples；commit `727108824362e373ee9cf6ba5abb04829aed4f04`。 |
| A standard perf gate | `/root` main supervisor | baseline 提交后在 clean exact candidate 执行 `npm run perf:gate`；读取 `docs/perf/baseline_2026-07-30.json`；输出 `.runtime/output/perf/baseline_2026-07-30/perf-gate-current.json` 与 generation/admission evidence | requested；成功条件：exit 0、baseline schema/contract 可读、环境与 workload contract 一致、enforced regression gate pass。 |
| A browser / Playwright | `/root` main supervisor | exact command、browser profile、output path 由主监督在取得唯一 lane 后落盘 | requested；成功条件：renderer ownership 路径无 page error、未处理 console error 与 network failure，具体 matrix 绑定 exact candidate SHA。 |
| A Pages/dist and core main-thread | `/root` main supervisor | `npm run verify:pages-dist`；`npm run verify:dist-drift`；`npm run verify:core:main-thread`，cwd 为 clean exact candidate | requested；成功条件：全部 exit 0，结构化报告与 manifest 绑定 exact candidate SHA。 |
| A independent review | B task read-only lane，主监督收口 | 首轮 review 与 final source review 均基于 exact Git objects | in progress；首轮 findings 已修复；final source review 的 summary binding、diagnostics atomicity、writer test-order 与 coordination drift 已在 `2ee6653f` 关闭，等待最终 verdict。 |

## Handoff

- A execution owner 提交 `ready-for-supervisor-validation` 包；主监督负责 stage、commit、integrate、live gates、review 与 `A_ADMITTED_SHA`。
- B 只能从正式 `A_ADMITTED_SHA` 建立 clean replay worktree；P4.4 recovery lineage 只作为职责级补丁来源。
- C 只能从正式 `B_ADMITTED_SHA` 建立产品里程碑 worktree。

## Next step

以 baseline-ratification commit 形成新的 clean exact candidate；主监督随后执行 exact P4.3、routes、core、Pages、browser、standard perf 与最终 review verdict。
