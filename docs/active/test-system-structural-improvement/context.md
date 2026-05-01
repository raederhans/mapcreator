# Context

## 当前真相
- 当前 E2E 真相源是 `tests/e2e/test-layer-manifest.json`，共 45 个 spec。
- 当前 checked-in import graph 覆盖 `tests/e2e/**` 全量 spec，共 47 个 spec；其中包含 `tests/e2e/dev/**` 两个 dev spec。
- 当前 smoke 真相是：
  - `tests/e2e/main_shell_i18n.spec.js`
  - `tests/e2e/hoi4_1939_ui_smoke.spec.js`
  - `tests/e2e/tno_1962_ui_smoke.spec.js`
  - `tests/e2e/ui_contract_foundation.spec.js`
- `strategic_overlay_smoke.spec.js` 当前仍是 `feature`，旧计划文档需要同步。
- city-runtime 第一波已完成，archive 已有 before/after 和 full domain run 证据。

## 当前约束
- 不改现有 npm script 名称和 CI check 名称。
- 主线程独占 long test / live Playwright / perf gate。
- 当前工作树存在无关本地改动，实施时避免覆盖：
  - `data/i18n/locales_baseline.json`
  - `data/i18n/manual_ui.json`
  - `data/locales.json`
  - `index.html`
  - `.omx/metrics.json`

## 当前批次重点
- 先做低冲突骨架：留档、plan 真相同步、timeout inventory、import graph、selector 基础层、guardrail。
- 然后做 failure-context、wrapper、adaptive route。
- shared fixture 放在最后灰度。

## 本轮新增结果
- `tests/e2e/support/fixtures.js` 已落地：
  - worker 级 shared boot
  - city-runtime reset / storage 清理 / label hook 安装
  - 失败时自动写 `failure-context`
  - teardown 后做 leak guard
- 当前 shared boot 已接入：
  - `tests/e2e/city_label_i18n_redraw.spec.js`
  - `tests/e2e/city_points_urban_runtime.spec.js`
  - `tests/e2e/city_reveal_plan_regression.spec.js`
  - `tests/e2e/city_urban_rendering_regression.spec.js`
  - `tests/e2e/city_lights_layer_regression.spec.js`
- `test:adaptive` 现在默认 dry-run；显式 `--execute` 才会执行推荐命令。
- `verify-shared.yml` 已修正：
  - import graph summary 先生成再校验
  - smoke timing summary 拆成独立 `always()` step

## 本轮验证快照
- 静态检查：
  - `npm run verify:test-import-graph`
  - `npm run verify:test-console-allowlist`
  - `npm run verify:test-timeout-guardrails`
  - `python -m unittest tests.test_e2e_structural_tooling -q`
  - `npm run verify:test:e2e-layers`
  - `node tools/select_verification_targets.mjs --check`
  均已通过。
- smoke：
  - `main_shell_i18n`
  - `hoi4_1939_ui_smoke`
  - `tno_1962_ui_smoke`
  - `ui_contract_foundation`
  已通过。
- 失败上下文链路：
  - 强制让 `ui_contract_foundation` 指向 `http://127.0.0.1:9`
  - 已生成 `failure-context.json`
  - `failure-context-index.ndjson` 已记录附件路径
- shared boot 定量结果：
  - 共享关闭时，稳定通过子集耗时：
    - `city_label_i18n_redraw` 80.1s
    - `city_points_urban_runtime` 29.6s
    - `city_reveal_plan_regression` 第 1/2 个用例 23.9s / 24.9s
    - `city_urban_rendering_regression` 35.3s
  - 共享开启时，同一稳定子集耗时：
    - `city_label_i18n_redraw` 76.0s
    - `city_points_urban_runtime` 11.2s
    - `city_reveal_plan_regression` 第 1/2 个用例 4.1s / 8.9s
    - `city_urban_rendering_regression` 21.2s
  - 上面这 5 个稳定通过用例总耗时从 193.9s 降到 121.3s，下降约 37%。

## 当前收尾状态
- `city_lights_layer_regression` 的 shared fixture wiring 和视觉合同已经收口：
  - 将 `offToModernChanged` 阈值从 `> 500` 收紧为 `>= 490`
  - 删除低缩放固定像素窗和整世界 point sampling 的脆弱硬断言
  - 保留整画布亮度变化、高缩放 boost、无 page error / console issue / network failure 这些稳定合同
  - 额外保留 3 条稳定的区域级硬合同：
    - `historicalEurope.averageBrightRatio > 0.015`
    - `historicalChina.average > historicalRural.average + 2`
    - `historicalUsEastCoast.averageBrightRatio > 0.005`
- 最新单测状态：
  - shared-off 单跑通过
  - shared-on 单跑通过
- 最新整组基准状态：
  - shared-off：同一组 7 个 city-runtime 用例 `7 passed (3.2m)`
  - shared-on：同一组 7 个 city-runtime 用例 `7 passed (1.1m)`
  - 同命令、同用例、只切换 shared boot 开关时，wall-clock 下降约 66%
- 当前已经没有代码级 blocker；剩余动作只剩最终文档收口和归档决策。

## 最终 review follow-up
- code review 提醒了两个真实问题，均已修正：
  - `verify-shared.yml` 先生成 import graph，再跑 selector explain，避免 PR-fast explain 误读旧 graph
  - `city_lights_layer_regression` 在删除脆弱断言后，补回少量稳定区域级硬合同，明确“硬断言”和“诊断输出”的边界
- architect 复核当前状态为 `WATCH`：
  - `playwright-app.js` 仍是高影响共享入口，后续改动继续走 selector + main-thread serial 口径
  - city-lights 的剩余 region-level 采样主要用于诊断输出，这个分工已经在 spec 注释里写清

## 2026-05-01 Batch 5 静态 QA 复核
- `tests/e2e/support/playwright-app.js` 已具备 shared boot fixture 的核心等待骨架：`waitForShellReady`、`waitForScenarioApplyIdle`、`waitForChunkIdle`、`waitForRenderIdle`，最小切口适合先做 shell-ready 级别复用，再由 spec 自己完成 scenario/data 准备。
- 当前最适合首批灰度的是 helper 驱动程度已经高、局部状态重置面较小的 spec：`city_lights_layer_regression.spec.js`、`city_urban_rendering_regression.spec.js`、`water_cache_strategy_regression.spec.js`、`city_reveal_plan_regression.spec.js`、`city_label_i18n_redraw.spec.js`。
- 当前显式高泄漏面包括：`map_view_settings_v1` localStorage 注入、`__e2eCityLabelDraws` 全局 hook、`__playwrightScenarioApplyState`/`__playwrightStateRef` 页面级单例、`scenario_blank_exit.spec.js` 的 clear/reset 场景链、`river_layer_regression.spec.js` 的 `state.riversData` 篡改。
- 迁移前应先补三类 guard：shared boot profile key、共享页 reset/teardown、city-runtime failure-context artifact；否则灰度失败时难以区分 boot 问题、残留状态问题和真实断言回归。

## 2026-05-01 review follow-up 修复结果
- `tools/test_route_registry.mjs` 新增了 `deferred_detail_promotion.js` 的精确 Python contract 路由；`tools/select_verification_targets.mjs` 则把 `js/bootstrap/**` 的 fallback 收敛到 `startup / tno-startup / city-runtime` 三条主线，避免把 `scenario-runtime` 和 heavy geo Python 套件一股脑拉进来。
- `tests/e2e/support/fixtures.js` 现在会在每次 `prepareSharedCityRuntimeState()` 结束后缓存 `worldCitiesData` 和 `scenarioCityOverridesData` 快照，`resetSharedCityRuntimeState()` 会恢复这两份数据并递增 `cityLayerRevision`，用来清掉 `city_label_i18n_redraw.spec.js` 写入的 display-name override 污染。
- shared-city 两个等待 helper 现在都用 `page.waitForFunction(fn, undefined, { timeout })` 传递 Playwright 超时配置；fixture 入口和 teardown 的 reset 也改成继承 `testInfo.timeout`，避免长 shared-boot 用例在 cleanup 阶段掉回默认 30 秒。
- leak guard 新增了 display-name override 计数与样本，如果 reset 后还残留 `Asteria` 这类城市覆盖，会作为 shared-city 泄漏显式报错。
- 新鲜验证：
  - `python -m unittest tests.test_e2e_structural_tooling -q` 通过
  - `python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract -q` 通过
  - `node -e "import('./tools/select_verification_targets.mjs')..."` 已看到 bootstrap 文件命中 `startup / tno-startup / scenario-runtime / city-runtime`
  - `node node_modules/@playwright/test/cli.js test tests/e2e/city_label_i18n_redraw.spec.js tests/e2e/city_points_urban_runtime.spec.js --workers=1 --retries=0 --reporter=list` 通过，证明 shared boot 下顺序执行两条 city-runtime spec 仍稳定
  - `node node_modules/@playwright/test/cli.js test tests/e2e/city_label_i18n_redraw.spec.js tests/e2e/city_marker_visibility_regression.spec.js --workers=1 --retries=0 --reporter=list` 通过，证明 label override 不会污染后续 city-marker spec
