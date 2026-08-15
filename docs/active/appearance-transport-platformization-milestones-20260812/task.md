# Appearance / Transport Platformization Task

## Current status

`A_POLICY_CHECKPOINT_READY` — P4.3 technical source `2ee6653f812febd69148f659b5baee7fe1e3edf8`；包含 Gate 1 Export correctness hotfix 的 Gate 0–4 integrated/pre-A functional baseline `1e6ff40fa1f21f7dec9c6f68306adf6bb20dea08`；post-structural exact policy checkpoint 由当前 Gate A candidate 承载；最终 live gates pending。`A_ADMITTED_SHA` pending；B、C 等待正式准入 SHA。

## Checklist

- [x] 复核当前 HEAD/status、`origin/main`、merge-base、ahead/behind 与 worktree topology。
- [x] 识别 A touched domains：`perf`、`state-ownership`、`test-routing`、coordination docs。
- [x] 完成 SF-ATS pre-edit adaptive dry-run。
- [x] 运行一次 delegated P4.3 policy generator 并捕获 fail-closed blocker；lane 已释放。
- [x] 修复 renderer cache diagnostics 参数遍历的 read-only scanner contract 并增加 regression。
- [x] 修复 exact-refresh/cache 动态 binding diagnostics，并把三个 source-owned runtime-state escapes 收敛到 frozen/previous allowance 31。
- [x] 生成并验证 P4.3 checked-in state-writer policy checkpoint。
- [x] 对齐 P4.3 routes、policy、tests 与协调记录。
- [x] 运行当前改动对应的 focused Node、Python、scanner、P4.3 Node 与 SF-ATS child-safe checks。
- [x] 复核未暂存 diff、route gaps、artifacts 与剩余风险。
- [x] 交付 `ready-for-supervisor-validation` 包。
- [x] 主监督生成并提交 schema 3 canonical baseline。
- [x] 主监督完成首轮 independent review，并关闭 raw-run binding、diagnostics own-property、policy atomic write 与 direct route findings。
- [x] 在 `1e6ff40f` integrated/pre-A functional baseline 及其 coordination descendant 上生成新的唯一 P4.3 checkpoint，并由当前 Gate A candidate 承载 policy 与 coordination evidence。
- [x] 固定 `1e6ff40f` integrated/pre-A functional baseline，并登记 inherited UI/demo/Pages、dormant change-set contract、pure export projection、detached scalar ownership 与 Gate 1 Export zero/null/default/facade correctness 边界。
- [ ] 主监督完成 browser、Pages/dist、core main-thread、standard perf 与最终 independent review。
- [ ] 主监督写入 `A_ADMITTED_SHA` 并解除 B 阻塞。
- [ ] B 完成 P4.4 replay/admission 并写入 `B_ADMITTED_SHA`。
- [ ] C 完成用户可见 Appearance / Transport milestone。

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git status --short --branch` | PASS；初始为 detached clean `HEAD`。 |
| `git rev-parse HEAD` | PASS；`bc900b7f80901d96c22deeceda6492fdfcb14b1f`。 |
| `git merge-base HEAD origin/main` | PASS；`5461c24aa5e40c3ea184dfee84db10630a199cbc`。 |
| `git rev-list --left-right --count origin/main...HEAD` | PASS；`0 12`。 |
| `git ls-remote --heads origin refs/heads/main` | PASS；remote main 仍为 `5461c24aa5e40c3ea184dfee84db10630a199cbc`，未更新本地 refs。 |
| SF-ATS pre-edit dry-run | PASS，exit 0；6 recommended commands；3 unmatched coordination records；artifact `.runtime/reports/generated/p43-milestone-a-ded1/pre-edit-adaptive-selection.json`。 |
| `npm ci` | PASS，exit 0；安装 lockfile 对应 5 packages，audit 0 vulnerabilities。 |
| `node tools/build_state_writer_policy.mjs --phase P4.3 --write` | FAIL，exit 1；PID `99112`；observed elapsed约 `460.4s`；`renderer_cache_actions.js#setSphericalFeatureDiagnosticsCacheEntryState` 的 `diagnostics` 参数在 lines 34/38/44 触发三处 `state-action-non-target-parameter-mutation`；policy 输出未变化；lane 已释放。 |
| focused Node first repair | FAIL 41/42；新 regression 将递归 `nextAncestors` 调用识别为同一 non-target alias escape，产品行为 14/14 保持通过。 |
| `node --test tests/renderer_cache_actions_behavior.test.mjs tests/state_writer_scanner_soundness_behavior.test.mjs` | PASS 42/42，exit 0；新增 scanner regression 通过，renderer cache 行为 14/14 通过。 |
| `npm run python -- -m unittest tests.test_renderer_cache_actions_boundary_contract -q` | PASS 1/1，exit 0。 |
| `node --check js/core/state/actions/renderer_cache_actions.js` 与 scanner test | PASS，均 exit 0。 |
| `git diff --check` | PASS，exit 0。 |
| `npm run -s test:python:p4:p4-3-boundary` | `UNKNOWN_WITH_PROCESS_EXIT_EVIDENCE`；top npm PID `486768`，Python PID `437852`，内部 policy checker PID `285336`；进程树自然退出，stdout/exit status 未被初始并行调度保留，bounded recovery 后保持零重跑；exact P4.3 gate 后续覆盖。 |
| SF-ATS post-edit dry-run | PASS，exit 0；8 recommended commands；production unmatched 0；三个 coordination docs 属于允许的 non-production unmatched；artifact `.runtime/reports/generated/p43-milestone-a-ded1/post-edit-adaptive-selection.json`。 |
| P4.3 route post-edit gate | EXPECTED FAIL，exit 1；2 owned、0 unmatched、2 `missing-expected-phase-command` gaps；checked-in policy 仍映射 current exact phase 到 P4.2c，policy P4.3 checkpoint 生成后重跑。artifact `.runtime/reports/generated/p43-milestone-a-ded1/p43-route-post-edit.json`。 |
| `node tools/build_state_writer_policy.mjs --phase P4.3 --write` rerun 2 | FAIL，exit 1；session `64956`，PID `549824`，observed elapsed `463.991s`；6 个 `state-action-policy-binding-diagnostics-invalid`；policy 输出未变化；lane 已释放。 |
| binding diagnostic read-only probe | PASS，exit 0；共同根因为 exact-refresh line 74 与 cache lines 19/22 的动态字段名 helper；所有 6 个 binding 期望均为 `target@0`、`path=$`、`allowedDynamicSites=[]`、P4.3。 |
| renderer exact-refresh/cache focused behavior | PASS 28/28，exit 0。 |
| P4.3 exact-refresh/cache policy binding regression | PASS 1/1，exit 0；两个 action 模块全部 binding diagnostics 为零且 `allowedDynamicSites=[]`。 |
| scanner soundness focused suite | PASS 28/28，exit 0。 |
| exact-refresh/cache Python boundaries | PASS 6/6，exit 0。 |
| updated `npm run -s test:node:p4:p4-3` | PASS 251/251，exit 0。 |
| SF-ATS post-binding-fix dry-run | PASS，exit 0；9 recommended commands；covered domains `renderer-runtime,state-ownership,test-routing`；production unmatched 0；三个 coordination docs 属于允许的 non-production unmatched；artifacts `.runtime/reports/generated/p43-milestone-a-ded1/post-binding-fix-adaptive-selection.{json,md}`。 |
| P4.3 route post-binding-fix gate | EXPECTED FAIL，exit 1；4 owned、0 unmatched、4 `missing-expected-phase-command` gaps；四个文件都已存在 `p4:p4-3-exact-phase` direct route，selector 因 checked-in `latestPhase=P4.2c` 推荐 current exact `verify:p4:p4-2c`；P4.3 checkpoint 后应切换为 `verify:p4:p4-3` 并重跑。artifact `.runtime/reports/generated/p43-milestone-a-ded1/p43-route-post-binding-fix.json`。 |
| `node tools/build_state_writer_policy.mjs --phase P4.3 --write` rerun 3 | FAIL，exit 1；session `7335`，PID `296772`，duration bounded `778.6s–816.2s`；runtime-state escape fingerprint actual 34、frozen/previous allowance 31；policy 输出未变化；lane 已释放。 |
| commit replay with current single-module scanner | PASS，exit 0；`784885f/100fd774=27`、`83b9dea8/8a0371f0=32`、`15ae13cb/bc900b7f=34`，定位三处 P4.3 source-owned overrun。 |
| current single-module scanner probe | PASS，exit 0；runtime-state escape fingerprint `34 → 31`，三个 repaired ancestry sites 均为 0，canonical `ensureProjectedBoundsCacheState(runtimeState)` sink 为 1。 |
| focused P4.3 policy/scanner regressions | PASS 2/2，exit 0；runtime-state escape budget 和 exact-refresh/cache binding diagnostics regression 均通过。 |
| renderer cache/diagnostics/delegation behavior | PASS 53/53，exit 0。 |
| renderer cache/diagnostics/runtime-state Python boundaries | PASS 12/12，exit 0。 |
| `npm run -s test:node:p4:p4-3` | PASS 251/251，exit 0。 |
| `npm run -s test:node:p4:p4-1` | PASS 101/101，exit 0。 |
| adaptive selector route manifest check | PASS，exit 0；362 routes。 |
| adjacent map-renderer Python boundaries | PASS 6/6，exit 0。 |
| SF-ATS post-alias-fix dry-run | PASS，exit 0；42 planned commands；production/test unmatched 0；三个 coordination docs 为 non-production unmatched；81 heavy commands skipped；artifacts `.runtime/reports/generated/p43-milestone-a-ded1/post-alias-fix-adaptive-selection.{json,md}`。 |
| P4.3 route post-alias-fix gate | EXPECTED FAIL，exit 1；6 owned、0 unmatched、6 `missing-expected-phase-command` gaps；checked-in policy 的 `latestPhase=P4.2c` 仍使 current exact route 指向 `verify:p4:p4-2c`；artifact `.runtime/reports/generated/p43-milestone-a-ded1/p43-route-post-alias-fix.json`。 |
| JS syntax and diff whitespace checks | PASS，exit 0；`map_renderer.js`、policy regression test 与 `git diff --check` 通过。 |
| `node tools/build_state_writer_policy.mjs --phase P4.3 --write` rerun 4 | PASS，exit 0；session `34106`，PID `545204`，elapsed `818.805s`；写入 207 writers；policy 长度 `10928785` bytes，mtime `2026-08-12T23:19:09.2651010+08:00`；lane 已释放。 |
| generated policy short read | PASS，exit 0；schema 2、`progress.latestPhase=P4.3`、唯一 P4.3 checkpoint。 |
| post-generator focused read contracts | PASS 3/3，exit 0；runtimeState alias fingerprint count 31、renderer cache non-target violations 0、exact/cache binding diagnostics 0。 |
| P4.3 exact route after generator 4 | PASS，exit 0；7 owned、0 unmatched、0 route gaps；artifact `.runtime/reports/generated/p43-milestone-a-ded1/p43-route-after-generator-4.json`。 |
| `npm run perf:baseline` | PASS，exit 0；生成 schema 3 canonical baseline，场景 `tno_1962`、`hoi4_1939`，每场景 5 runs、3 warmups，environment admission 与 generation fence 均 stable；commit `727108824362e373ee9cf6ba5abb04829aed4f04`。 |
| baseline JSON round-trip repair | PASS；CPU evidence 以持久化精度重新计算，perf role 50/50、combined render sample policy 78/78、Python gate 26/26；commit `4ec129c8ef7e236bf73edde43bcd30ba84f45790`。 |
| Pages/dist canonical publish | PASS；`verify:pages-dist`、Python 47/47、landing 18/18、sample 18/18；dist publish commit `0b1181e70087087f7daefa6842d498990466c25c`，architecture repair commit `7319193e72612bae9aa7c28f7f506e93d5d554e8`。 |
| exact `7319193e` generator | PASS，exit 0；PID `468364`，duration `991.240s`，207 writers，schema 2、latestPhase P4.3、唯一 P4.3 checkpoint；checkpoint commit `b66ebeaa700054a01129783a5ba956705e152d3d`。 |
| independent review | REQUEST CHANGES；P0 0、P1 1、P2 4；accepted fixes：baseline raw-run/role binding、diagnostics inherited/accessor isolation、atomic policy replacement、standard perf direct route、coordination drift。 |
| review-fix focused evidence | PASS；perf contract 51/51、diagnostics behavior 11/11、diagnostics Python 6/6、delegation edges 30/30、verification metadata 29/29、architecture boundary、SF-ATS dry-run 35 commands / 0 unmatched。 |
| review-fix source commit | PASS；`21bfb35aeaa18ba1b35723f2f1972ce2e07a7f92`，12 files，Pages source/dist/manifest 同步；提交后 `verify:dist-drift` 与 architecture boundary 均 exit 0。 |
| obsolete-source generator at `08b470d9` | STOPPED；PID `115400`，duration `642.100s`，wrapper exit `-1`；final source review 发现 summary/raw drift 后由主监督核验 command identity 并停止；policy length/mtime 未变化。 |
| final source review fixes | PASS；场景 `summary.canonicalRenderSampleMs` 与 raw-run recomputed median 强绑定；diagnostics missing-holder dual commit 全量 preflight；atomic writer测试锁定 `open → write → sync → close → readback → rename`。 |
| final source review focused evidence | PASS；perf contract 51/51、diagnostics/delegation 41/41、diagnostics Python 6/6、state-writer focused 2/2、architecture boundary、SF-ATS dry-run 23 commands / 0 unmatched。 |
| final source review-fix commit | PASS；`2ee6653f812febd69148f659b5baee7fe1e3edf8`，8 files，source/dist/manifest 同步。 |
| integrated/pre-A functional baseline ratification | PASS；baseline `1e6ff40fa1f21f7dec9c6f68306adf6bb20dea08`；toolbar 3098/3100、structural 54/54、Export focused 15/15、state-writer targeted multiset 251/17/93/154 且 delta/missing 为空、state-writer quick 260/260、SF-ATS child-safe PASS / unmatched 0；explicit zero 保留，null/undefined/blank 恢复默认值，facade fail-fast 后绑定 controller owner；dormant change-set contract 保持零 runtime writer/UI wiring/Apply bridge/history persistence。 |
| pre-structural P4.3 checkpoint | SUPERSEDED；generator 写入 207 writers；commit `dac80102a1c8bfbdf9a479e9a6866b6211afef90`；随后 pure projection extraction 改变 source coordinates，需要新的 exact checkpoint。 |
| canonical P4.3 runner attempt at `dac80102` | STOPPED after scope review；Node P4.3 258/258 passed；policy evidence scan运行 `1,196,355ms` 后由主监督停止；candidate 被 integrated baseline contract revision取代，未形成 admission evidence。 |
| post-structural P4.3 checkpoint | PASS；输入 pre-A functional baseline `1e6ff40f`、published candidate `e77fdb89`；canonical generator exit 0，写入 207 writers；schema 2、`progress.latestPhase=P4.3`、唯一 P4.3 checkpoint；六项 legacy metrics 与六组 retired authority counts 逐项不变；quick policy suite 260/260；policy 与本 coordination evidence 由当前 Gate A candidate 承载。 |

## Open risks and remaining work

- canonical baseline 已推进到 schema 3；raw runs、stored roles、role summary 与 scenario canonical median 均由 validator 重新推导并绑定。
- checked-in state-writer policy 已推进到 P4.3；post-structural exact checkpoint 与当前 Gate A candidate 绑定。
- 新 checkpoint 后重跑 exact P4.3 route；目标为 owned paths 全覆盖、production unmatched 0、route gaps 0。
- pre-edit selector 报告三个新 coordination docs unmatched；这些路径只记录状态与交接，production unmatched count 为零。
- browser、dev server、Playwright、core main-thread、standard perf、heavy-geo、scenario-data 和共享 `.runtime` locks 保留给主监督；Pages 生成产物已提交且 source/dist blob 精确一致，完整 Pages/dist gate 仍需绑定最终候选 SHA 重跑。
- 当前 worktree 的 index、refs、branch topology 与 remote 保持不变；最终改动将保持未暂存。
