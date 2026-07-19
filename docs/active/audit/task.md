# Task

## Current status

进行中：base baseline 场景错误与分类式阈值策略已在 GitHub-hosted runner 验证；current 诊断新增 `ERR_CONNECTION_FAILED` 证据，有界恢复回归已完成，等待新提交的远端检查。

## Checklist

- [x] 读取自动化记忆、Skill、教训和 worktree 注册表。
- [x] fetch `origin` 并确认 `main...origin/main = 0/0`。
- [x] 选定 8 个相关非文本提交。
- [x] 完成代码/安全/性能 review lane。
- [x] 完成架构/边界 review lane。
- [x] 修复并补充回归覆盖。
- [x] 运行 SF-ATS 自适应选择与目标验证。
- [x] 定位 GitHub-hosted same-runner base baseline 的两次失败。
- [x] 让 base/current 使用完全相同的两个 gate 场景并保留失败证据。
- [x] 证明 base/current 应用代码相同时单批次阈值会产生 runner 噪声假失败。
- [x] 将运行时改动设为阈值阻断，将 gate/tooling 自检的数值差异设为诊断证据。
- [x] 用浏览器诊断证明本地 120 秒等待来自 `net::ERR_NETWORK_CHANGED`，并加入有界单次恢复。
- [x] 修复共享 city worker fixture 的 30 秒外层预算与 120 秒内部启动等待冲突。
- [x] 复核两个隔离 worktree，确认均未达到 `ready-for-integration`。
- [ ] 完成 follow-up Lore commit、push、GitHub Actions 验证与清理。

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git fetch --prune origin` | exit 0 |
| `git rev-list --left-right --count main...origin/main` | `0 0` |
| `git status --short --branch` | clean `main...origin/main` |
| `git worktree list --porcelain` | 仅当前 main worktree |
| `node --test tests/perf_role_governed_report_behavior.test.mjs` | follow-up 后 23/23 passed；覆盖分类式阈值、网络错误识别、单次恢复和持续失败 |
| `py -3 -m unittest tests.test_perf_gate_contract -q` | 24/24 passed |
| `py -3 -m unittest tests.test_e2e_structural_tooling -q` | 36/36 passed |
| `node tools/select_verification_targets.mjs --check` | 337 routes passed |
| SF-ATS changed-file dry-run | 13 files；5 个 unmatched 均为非生产 workflow/task-doc/timeout-allowlist 路径 |
| SF-ATS follow-up dry-run | 9 files；19 个推荐命令；影响 perf、city-runtime、test-routing、playwright-observability；3 个 unmatched 均为 workflow/task docs |
| SF-ATS child-safe recommended commands | 全部 exit 0；Williams runner 15 passed、1 个显式 live skip |
| `npm run -s perf:gate` | exit 0；两个核心场景，合同/role/阈值失败均为 0 |
| GitHub Actions run `29690544801`, attempts 2/3 | base baseline 均失败；第二次证据确认卡在额外的 `blank_base`，current gate 尚未开始 |
| prospective base 命令合同 | 明确 `--scenarios tno_1962,hoi4_1939 --runs 5 --warmups 3`；失败日志和浏览器诊断会在删除临时 worktree 前复制 |
| GitHub Actions run `29691472324` | base baseline passed；同应用代码的 current 在 `tno_1962.refreshScenarioApplyMs` 出现 18.8% 单批次漂移并触发假失败 |
| `npm run -s perf:gate -- --regression-mode diagnostic --raw-dir .runtime/output/perf/audit-diagnostic-mode` | exit 0；mode=`diagnostic`、enforced=`false`、合同/role/failure 均为 0 |
| `.runtime/tests/playwright/perf-baseline/tno_1962-run-04-1784473788631.json` | 失败请求集中记录 `net::ERR_NETWORK_CHANGED`；页面已加载而应用启动被网络切换中断 |
| `npm run -s perf:gate -- --raw-dir .runtime/output/perf/audit-enforce-mode-retry` | exit 0；mode=`enforce`、enforced=`true`、合同/role/failure 均为 0 |
| GitHub Actions run `29693353672` | classifier=`diagnostic`；base baseline passed；current warmup-01 因 localhost `net::ERR_CONNECTION_FAILED` 失败，artifact `8444329507` 保留浏览器与 server 证据 |
| `node --test tests/perf_role_governed_report_behavior.test.mjs` + perf contract（`ERR_CONNECTION_FAILED` follow-up） | 23/23 + 24/24 passed；泛化 `ERR_FAILED` 仍不在白名单 |
| `npm run -s python -- -m unittest tests.test_e2e_structural_tooling -q` | 36/36 passed；锁定 shared city worker fixture 的独立 120 秒预算 |
| `node tools/e2e_layering.mjs run-spec tests/e2e/city_label_i18n_redraw.spec.js` | 修正 fixture timeout 后 1/1 passed，测试 1.1m、run 2.0m |
| `node tools/e2e_layering.mjs run-spec tests/e2e/city_lights_layer_regression.spec.js` | 1/1 passed，1.1m；page/console/network 问题均为空 |
| 临时 base worktree 受治理输入投影探针 | exit 0；lockfile 与 TNO manifest 哈希匹配；worktree 已清理 |
| code-reviewer 最终复核 | APPROVE；原 HIGH/LOW 均关闭 |
| architect 最终复核 | APPROVE；same-runner dependency/workload identity BLOCK 已关闭 |
| `py -3 -m unittest tests.test_e2e_structural_tooling -q`（最终） | 36/36 passed；stale timeout allowlist 已删除 |
| `git push origin main` | `07d95eaa..4905fb69` pushed；随后 `HEAD == origin/main == 4905fb696d9a5222aea628937fd2bc804109ae1f` |

## Open risks and remaining work

- follow-up 提交仍需 GitHub-hosted same-runner workflow 最终证明。
- `mapcreator-audit-20260719-followup` 是未提交旧方案，未整合；待独立清理流程确认恢复价值。
- P4 worktree 仍处于未提交开发状态，本轮保持隔离。
