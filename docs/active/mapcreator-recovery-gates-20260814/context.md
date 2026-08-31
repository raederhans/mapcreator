# Map Creator Recovery Gates Context

## Current truth

- 2026-08-14 frozen origin baseline：`origin/main == 7ddcee0d613b0210a37e287c77e49c90443bd415`；当前 `main` 已串行集成 Gate 1 与 Gate 2，保持本地 ahead、remote 未改。
- 当前 checkout：`C:\Users\raede\Desktop\dev\mapcreator`，`main`；另有 Gate 2/3/4 三个 detached candidate worktree，均从 `7ddcee0d` 创建。
- 用户已授权依次执行 Gate 0 至 Gate 5，并要求多个独立协作子代理与主线程总监督。
- 当前项目优先级仍为 Appearance + Transport 平台化；Gate 0–4 是其产品准入、反馈经济性、架构和性能前置条件。
- 主线程拥有 index、refs、branch/worktree topology、remote、共享文件、integration、live tests 和最终 verdict。

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-08-14 | 采用 Gate 0→5 顺序执行 | 后续 Gate 只读取上一 Gate 的 frozen SHA 与 artifacts。 |
| 2026-08-14 | 复用现有 P4、test-reform、Appearance/Transport 记录作为技术事实源 | 本目录只维护跨 Gate 总控状态和交接。 |
| 2026-08-14 | `index.html`、`css/style.css`、`js/ui/toolbar.js` 由主线程串行编辑 | 子代理提供 read-only evidence 或非共享文件交付。 |
| 2026-08-14 | 主线程独占 dev server、browser、Playwright、Pages/dist、perf、heavy-geo、scenario-data、checkpoint builder 和 `.runtime` locks | 子代理只读取已完成日志/artifacts，保持 live process 单 owner。 |
| 2026-08-14 | Gate 1 以 Export Snapshot false-failure 与短高度布局为首批缺陷 | Golden Demo 将覆盖真实下载、成功 UI、console/network 和布局碰撞。 |
| 2026-08-14 | P4.3 scope 固定在现有 admission contract | P4.4 从正式 A baseline 启动，P4.5 保持隔离。 |
| 2026-08-14 | Gate 0 canonical perf 第一次被环境 CPU admission 拒绝；短静默窗口后的第二次 admission 与 generation fence 通过 | 保留首次 fail-closed 证据，正式结果使用第二次完整测量。 |
| 2026-08-14 | Gate 0 perf 在 exact `7ddcee0d` 完成 3 warmups + 5 runs，并发现 5 个 enforced regressions | Gate 0 以“基线与阻塞已确定”收口；Gate 4 负责性能恢复，Gate 1 保持同 profile 可比较性。 |
| 2026-08-14 | Gate 1 runtime taxonomy 将 favicon 归为 editor shell 缺口、auth 401 归为 eager probe、preload warning 归为 document/Worker consumer mismatch、D3 warning 归为 polar topology 生成缺陷 | 前三项进入 Gate 1 窄修复；polar water 进入 Gate 4 高风险数据工作包。 |
| 2026-08-14 | 用户授权额外 Codex 对话并行；已排队 Gate 2、Gate 3、Gate 4 三个隔离任务 | 主线程保持 integration owner，Gate 1 验证与后续 worktree 合并串行执行。 |
| 2026-08-14 | Gate 1 Golden Demo 5/5 与 responsive 五视口通过；Pages source/dist mirror 完成 canonical build | Gate 1 可以形成独立提交；D3 polar water 与 927.38 MiB dist 进入 Gate 4。 |
| 2026-08-14 | Gate 2 candidate 在 `c294` source-final；Gate 3 domain seam 在 `8288` source-final | Gate 2 路径与 Gate 1 零重叠，可在 Gate 1 提交后独立 commit/cherry-pick；Gate 3 等待 B admission。 |
| 2026-08-14 | Gate 2 verification portfolio 已集成，独立复核最终 CLEAR | PR workflow 串行为 `pr-fast → pr-smoke → demo`；history/profile/empty-set/deferred consumer 均 fail-closed。 |
| 2026-08-14 | 完整 sample-guide 进入 Nightly，canonical `verify:demo` 只执行 `@golden-demo` 核心旅程 | 完整覆盖 5/5、4.4m；PR Demo 1/1、139.480s，满足 3 分钟反馈预算；Demo route 的 commandRef 与 PR consumer 均为 `verify:demo`。 |
| 2026-08-14 | 代表性单 UI PR 组合执行 5 次 | 本机 nearest-rank p95 35.615s；GitHub runner 的真实 p95 由后续 timing artifacts 累积。 |
| 2026-08-14 | P4.1 Python boundary 在 PR adaptive lane 中实测 734.191s，并执行完整 state-writer policy 扫描 | P4.1/P4.2a/P4.2b/P4.2c/P4.3 Python boundaries 统一归入 `main-thread` / `heavy` / `full` / `.runtime-output`；focused action-route contracts继续由 child-safe lane 执行。 |
| 2026-08-14 | 最终 canonical `verify:pr` 执行 204 条 child-safe 命令，47 条主线程命令 deferred | 全部执行结果通过，production unmatched 0；Gate 2 验证组合形成正式闭环。 |
| 2026-08-14 | Gate 2 文档更新后的 SF-ATS dry-run 推荐 260、保留 204、阻塞 47 | route gaps 0、production unmatched 0；最终 canonical 将在同一内容候选上重放并刷新执行 artifact。 |
| 2026-08-14 | P4 policy delta 将 Gate 2 测试 fixture 与 post-apply diagnostics 识别为 A admission 前置 | 测试改用只读 getter/索引断言，diagnostics 经局部 wrapper 收拢；focused scenario 138/138 与 state-writer quick 259/259 通过。 |

## Agent ownership

| Lane | Owner | Scope | State |
| --- | --- | --- | --- |
| 总监督 / integration | `/root` | 共享文件、Git/index/refs、task records、live tests、最终验收 | active |
| Gate 0/1 Demo mapping | `/root/demo_gate_mapper` | Golden Demo、Export、console/network、responsive 契约，只读 | completed；handoff received |
| Gate 2 verification mapping | `/root/verification_gate_mapper` | scripts、verify:core、SF-ATS、四层组合，只读 | completed；handoff received |
| Gate 3/4/5 architecture/perf mapping | `/root/architecture_perf_mapper` | capability seams、P4 boundaries、startup/dist，只读 | completed；handoff received |
| Gate 1 export dependency | `/root/export_contract_executor` | export controller required dependency 与 focused Node regression | completed；changes present，待主线程 live 验收 |
| Gate 1 Golden E2E | `/root/golden_e2e_executor` | Snapshot download、PNG、short-height layout regressions | completed；changes present，待主线程 Playwright |
| Gate 1 auth probe | `/root/auth_probe_executor` | project-support session lazy probe 与 focused regression | active；禁止 live/Git/shared files |
| Gate 1 shell contracts | `/root/shell_contract_executor` | source/dist favicon 与 startup preload 静态合同 | active；仅修改 pages startup shell tests |
| Gate 2 candidate task | `019fff60-fdf6-7a21-9237-389d3a42c2d9` / `c294` | PR/Demo/Nightly/Release verification portfolio | completed；candidate committed and cherry-picked，independent review CLEAR |
| Gate 3 candidate task | `019fff61-035e-70f2-8346-02bf82fbfa51` / `8288` | Appearance/Transport versioned seam contract | completed；pure contract candidate，等待 B admission |
| Gate 4 candidate task | `019fff61-72d8-72d3-8b73-e35268a38c31` / `1d67` | startup/dist inventory contract | active；隔离 worktree |

## Live process ownership

| Process | Owner | Command / cwd / outputs | State |
| --- | --- | --- | --- |
| Gate 0 dev server | `/root` | exact command pending；cwd 当前 repo；日志必须位于 `.runtime/dev/` | reserved / inactive |
| Gate 0 browser / Playwright | `/root` | exact profile pending；产物位于 `.runtime/browser/` 与 `.runtime/tests/playwright/` | reserved / inactive |
| P4 checkpoint builder | `/root` | canonical command由现有 P4 contract 决定；单 writer | reserved / inactive |
| Pages/dist | `/root` | `verify:pages-dist`、`verify:dist-drift`；共享 dist/output | reserved / inactive |
| Core main-thread | `/root` | `verify:core:main-thread`；稳定日志位于 `.runtime/` | reserved / inactive |
| Standard performance | `/root` | `npm run -s perf:gate`；cwd 当前 repo；日志 `.runtime/output/perf/recovery-gate0-perf-gate-attempt2.log`；artifact `.runtime/output/perf/baseline_2026-07-30/perf-gate-current.json` | released；environment admitted、generation fence stable、5 enforced regressions、exit 1 |
| Gate 1 Playwright | `/root` | `sample_guide_deeplink.spec.js`、responsive focused、Golden `--repeat-each=5`；outputs `.runtime/tests/playwright/` | released；responsive PASS，Golden 5/5，port 8810 released |
| Gate 1 Pages/dist | `/root` | `npm run -s verify:pages-dist`；log `.runtime/tests/recovery-gate1-pages-dist.log` | released；builder + 48 Python + 18 landing + 18 sample PASS |
| Gate 2 Demo | `/root` | `npm run -s verify:demo`；log `.runtime/tests/playwright/recovery-gate2-demo-canonical.log` | released；1/1 PASS，139.480s，port 8810 released |
| Gate 2 PR budget | `/root` | fixed PR guards + explicit single-UI adaptive execute/defer；logs `.runtime/tests/recovery-gate2-pr-budget*.log` | released；5/5 PASS，local p95 35.615s |
| Gate 2 final PR gate | `/root` | `npm run verify:pr`；adaptive report `.runtime/reports/generated/test-adaptive-selection.{json,md}` | released；204 executed PASS，47 deferred，unmatched 0 |

## Handoff

- Demo mapper 已确认 `toolbar.js` 的 `showToast` 装配缺口、Golden E2E 下载覆盖缺口和短高度布局测试缺口。
- Verification mapper 已确认 `.github/workflows/verify-shared.yml` 的 PR-fast 动态遍历全部 198 个 `test:node:*` scripts；现有 selector、resource lock、CI profile 和 exact supersession surfaces 可直接承载四层组合。
- Architecture/performance mapper 已确认执行依赖为 P4.3 A admission → P4.4 B replay/admission → Appearance/Transport C lifecycle；Startup 已有 deferred owners，Pages builder 已生成 reachability/largest-files manifest。
- 子代理提交的结论只作为候选；主线程核对当前文件后编辑、验证和集成。
- Gate 1 SF-ATS dry-run exit 0，risk high、route gaps empty；6 个 child-safe commands exit 0。`verify:toolbar-split-boundary` 在 frozen HEAD 已超 3100-line budget，当前一行 wiring 将 3185 增至 3186，Gate 3 必须通过真实拆分恢复 ratchet。
- Gate 1 的正式 runtime tracker仅放行 exact polar-water warning；favicon、preload、guest auth 401、Snapshot false-failure 均从 Golden 基础旅程移除。D3 warning仍代表被丢弃的 Arctic/Southern geometry，等待生成链修复。
- Gate 1 横向 28-test UI selection 的唯一初始失败来自 `sidebar_default_collapse` stale assumptions；测试现等待 toolbar listener、接受 scenario apply 的明确 auto-open，并以 summary click覆盖允许 empty-state 的 Special Regions。focused rerun 1/1。
- Gate 2 将动态遍历全部 Node scripts 的 PR-fast 替换为 canonical fixed guards + changed-file adaptive execution；exact supersession 和 deferred evidence 保持可追踪。
- Gate 2 Demo workflow 现在调用 canonical `verify:demo`，核心 journey 具备真实 PNG、success lifecycle 与 runtime issue assertions；完整 sample-guide 套件继续作为更深回归。

## Next step

提交 Gate 2 收口；以当前 exact main identity 审计 P4.3 admission 输入，完成 A checkpoint 后再处理 P4.4 B replay/admission，随后重放 Gate 3 Appearance/Transport pure contract candidate。

## Runtime Architecture Reset v1 — Stage C current truth (2026-08-31)

本节是 Stage C 的当前执行事实，优先于上方 2026-08-14 的历史 `Current truth`、ownership 与 `Next step`；历史内容保留用于追溯。

- Entry identity：Stage C 原始进入身份为 `main@2bd9493f9f93e19689b6865b0822160cd787b171`；共同 baseline amendment 由 PR #115 合并为 `9bf4bc135dd8a23b2226c7dbf6d312a2ffd0ad76`，当前集成分支从该 SHA 开始。
- Stage A 已由 PR #112 以 merge commit `c346eb708e8868396b0ae8c63f8173d1880c9498` 收口；Stage B 已由 PR #113 以 merge commit `46cd2d9bae9564a9ebfe55a951226d23943dde9a` 收口；docs closeout PR #114 的 merge commit 为当前 entry identity。
- C1 当前事实：`ContentAddressedArtifactCache/v1` 已集成，startup-support 可按完整 content identity admit、lookup、materialize、verify 与 fail-closed restore；session/checkpoint 记录 manifest/tree identity，旧 signature 保留兼容重建路径。
- C2 当前事实：road maturity projection 已集成；workbench preview、main-map overview、apply bridge 与 Pages `transport-workbench` owner 分别由自己的 evidence surface 决定，缺失、类型错误、family mismatch 与冲突均独立 fail closed。
- Retirement truth：`pages-tracked-dist` 虽有历史 3/3 green eligibility，authorization 仍为 withheld，且 exact receipt bytes/identity 不可用；`catalog-projection` 仅 1/10。两者本阶段都必须保留。

### Stage C ownership

| Lane | Owner | Scope | State |
| --- | --- | --- | --- |
| Stage C integration | `/root` | task records、Git/index/refs、PR、worktrees、共享验证 | active；local candidate ready |
| C1 content-addressed artifact | `01a056e9-5666-70c2-b2fe-4146e31ed613` | CAS core、startup-support/session adapter、focused Python tests | completed；candidate `44f34021`，integrated `03fd1267` |
| C2 road maturity projection | `01a056e9-5684-7740-bc5e-f9a5462101c5` | transport capability maturity resolver、focused Node test | completed；candidate `a7bb1811`，integrated `90ce3ac0` |
| C1 read-only mapper | `/root/stage_c_content_map_v2` | 现有 artifact/cache/session/Pages seam | completed |
| C2 read-only mapper | `/root/stage_c_maturity_map_v2` | road vertical-module/maturity/Pages owner seam | completed |

### Stage C handoff constraints

- C1 和 C2 文件所有权不重叠；两条执行任务不得修改 task records、Git refs、worktree registry、verification catalog 或对方 owner 文件。
- worker 不得 push、创建 PR、合并、清理 worktree 或运行 Pages/dist、browser、Nightly、Release、performance 等共享/长任务。
- 主线程在两个候选完成后按 C1 → C2 串行集成；如果 C1 选择 Pages adapter，则它同时独占 `tools/pages_artifact_admission.py` 与对应 tests，C2 不触碰 Pages 实现。
- 内容寻址 key 使用完整 `sha256:<64 hex>`；任何 source/builder/object/manifest identity 不匹配都返回拒绝或 unavailable，不进行推断。

### Stage C next step

由 `/root` 创建 integration PR，等待 required checks 后合并 protected `main`；随后归档原始候选 refs、归档两个 user-visible tasks，并解除两个隔离 worktree。

### Stage C live process ownership

| Process | Owner | Command / cwd / shared outputs | Log | Success / failure / stop | State |
| --- | --- | --- | --- | --- | --- |
| Pages/dist regeneration | `/root` | `npm run -s verify:pages-dist`；cwd `C:\Users\raede\Desktop\dev\mapcreator`；共享 `dist/` 与 `.runtime/` | `.runtime/tests/stage-c-pages-dist.log`；stderr `.runtime/tests/stage-c-pages-dist.stderr.log` | builder 913.73 MiB、startup shell 62/62、landing assets 10/10、showcase view 20/20；source/dist no-index diff clean | released / PASS |
