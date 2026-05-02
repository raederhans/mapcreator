# Maintainability / Stability Roadmap Context

## 2026-05-02 重新激活
- 用户要求按 2026-05-02 最新后续计划一直执行到全部目标完成，并尽可能多部署子代理辅助。
- 已读取：`lessons learned.md`、`docs/shared/agent-tiers.md`、历史 archive 留档、相关 memory 条目。
- 当前任务以 live code 为准，旧 archive 只保留历史参考价值。

## Batch 0 收口
- 已恢复 `docs/active/maintainability-stability-roadmap/` 作为唯一正式 task 载体。
- 已修复 `tools/build_pages_dist.py` 漏发 `runtime_asset_registry.json`。
- 已确认 transport 当前真实口径：
  - `road/rail` 继续 preview-only
  - `airport/port` 继续条件开放

## Batch 1 收口
- state guardrail ratchet 已落地：
  - `node tools/check_state_write_allowlist.mjs` 当前是 `83 tracked files`
- policy table v2 已落地：
  - `data/country_feature_policies.json` 升到 `schema_version: 2`
  - `js/core/country_feature_policies.js` 与 `map_builder/country_feature_policies.py` 共读同一 owner
- feature identity 主路径已收口：
  - 新增 `js/core/feature_identity_shared.js`
  - 主线程与 classic worker 统一走共享 helper
  - `country_feature_policies.json` 也已纳入 `runtime_asset_registry.json`

## Batch 2 收口进展
- city lights historical 1930 已外部化：
  - `data/city_lights/historical_1930_entries.json`
  - `js/core/city_lights_historical_1930_asset.js` 只保留 metadata + loader
- runtime asset registry 第二波主路径已收口：
  - 吸收 world cities、city aliases、runtime political、context layers、transport catalogs/manifests、city lights entries、country feature policies
  - 未发布的 detail topology 变体继续留在 `data_loader.js` 本地常量，避免 Pages dist 产生虚假 runtime 路径
- Batch 2.3 当前状态：
  - Node/static 合同已补齐 `color_manager`、physical layer、political raster、river layer
  - 主线程又补跑 targeted Playwright：
    - `physical_layer_regression.spec.js` 通过
    - `river_layer_regression.spec.js` 先后暴露两类测试链问题：
      - startup bundle preload warning 需要纳入 river spec 的 console allowlist
      - 首次 fresh page 采样会读到全量 rivers metric，必须等 render idle 后重新应用 subset，再读取目标 metric
    - 当前已通过：
      - river spec 增补 startup preload warning allowlist
      - river spec 改用 `waitForAppInteractive / waitForShellReady / waitForScenarioApplyIdle / waitForRenderIdle`
      - subset 采样改成先确认 `state.riversData.features.length` 与目标 subset 一致，再读 `drawRiversLayer` metric
    - 最终 targeted Playwright 已通过：
      - `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js --workers=1 --retries=0`
      - `3 passed (5.3m)`，日志：`.runtime/tests/playwright/batch23-river-split-fix4.out.log`

## Batch 3 收口进展
- scenario transaction seam 已显式拆成 `preCommit -> commit -> postCommit`
- transport preview registry 已改成 config-driven factory
- renderer shrink 已按顺序完成四刀：
  - `city_label_owner.js`
  - `color_resolution_strategy.js`
  - `render_pipeline_passes.js`
  - `render_cache_owner.js`
- `init_map_data.py` stage 化已按顺序完成当前计划主线：
  - `base_stage.py`
  - `validation_schema.py`
  - `detail_topology_stage.py`
  - `runtime_political_topology_stage.py`
  - `primary_topology_stage.py`
- 当前 `init_map_data.py` 已保留 orchestrator 兼容 wrapper，主体 download / clean / topology / merge / export 流程已下沉到 owner 模块

## 当前验证链
- Pages dist：
  - `python tools/build_pages_dist.py` 通过
  - 最新体积：`947.20 MiB`
- state / policy / manifest：
  - `node tools/check_state_write_allowlist.mjs` 通过
  - `tests.test_country_feature_policies_contract`、`tests.test_data_manifest_contract` 通过
- renderer / scenario / transport / city lights：
  - 相关 Python/Node contract 全部通过
  - `tests.test_build_orchestrator` 当前 `21` 个 wrapper/stage 合同通过
- targeted Playwright：
  - `physical_layer_regression.spec.js` 通过
  - `river_layer_regression.spec.js` 通过：`3 passed (5.3m)`

## 最终收尾
- 已完成最终 review / 查 bug / 第一性原理复核：
  - 静态 reviewer 与 verifier 都确认当前可归档
  - transport Apply capability 命名仍建议后续单列收口，但不阻塞本轮 roadmap 关闭
  - `map_renderer.js` 本轮验收口径保持“四个 owner extraction 完成”
  - `init_map_data.py` 本轮验收口径保持“stage seam 完成”
- 已更新 `lessons learned.md`
- 已清理额外子任务留档，只保留本目录这一组正式 task 文档
- 已完成 active -> archive 目录移动，本轮任务已归档
