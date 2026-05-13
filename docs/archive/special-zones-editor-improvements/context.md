# Context

## 已知事实

- 计划来源：上一轮审计版计划；当前执行策略是“收口当前 WIP + 修高风险缺口”。
- 记忆确认：`runtimeState.specialZoneLayers` 是 canonical model；`special_zone_editor.js` 是 legacy compatibility；workbench 负责 layer membership 和 style。
- lessons learned 关键约束：UI controller 拆分后测试要盯 owner 文件；live test 归属先锁死；legacy facade 仍在运行链上时保留薄 facade。

## Live process ownership

- 主线程拥有全部 test/browser 运行。
- 子代理只允许静态分析、测试设计、review。
- 本轮没有启动浏览器；只做 targeted node/python/static selector 验证。

## 当前进度

- 2026-05-13：创建 Ralph context snapshot：`.omx/context/special-zones-editor-improvements-20260513T135601Z.md`。
- 2026-05-13：子代理静态审计确认核心缺口：Workbench controller 注入缺 `markDirty/render/updateToolUI/showToast`，E2E 仍引用 `#toggleSpecialZones/#specialZoneTypeSelect`，topology diagnostics 缺少固定合同。
- 2026-05-13：主线程串行修复共享文件：`toolbar.js` 注入 Workbench 回调；Workbench header 新增 `[data-special-zone-overlay-toggle]`，负责 `runtimeState.showSpecialZones`、load、dirty、render。
- 2026-05-13：新增 `resolveSpecialZoneTopologyFingerprint(runtimeState)`，按 `scenarioBaselineHash` -> `activeScenarioManifest.source.runtime_topology_sha256` 解析；scenario resources、project export/import、interaction import、Workbench normalize/save 已接入。
- 2026-05-13：Workbench diagnostics 显示 `topology_fingerprint_mismatch/invalid_feature_id/duplicate_layer_id_dropped/legacy_special_zone_fields_dropped`，mismatch 首次出现 toast。
- 2026-05-13：同步测试：合同测试锁住 legacy selector 退场、overlay toggle、topology diagnostics；Node 行为测试覆盖 overlay toggle、diagnostics、scenario save；E2E stale selector 已迁到 Workbench selector或 runtime state。
- 2026-05-13：targeted 验证通过；rg runtime/e2e stale selector 扫描无命中。

## 剩余内容

- Phase D 能力扩张留到后续 sprint。
- 本轮未跑完整 Playwright UI smoke；当前计划的稳定性证据来自 node/python/static selector gate。
- 2026-05-13：最终 review 发现 Save 首次 load 会覆盖本地 pending state、drawer 删除不刷新、legend seam 未按 showSpecialZones 过滤；已修复并重跑 targeted tests 与 quick browser smoke。
- 2026-05-13：验收完成，准备归档。
- 2026-05-13：hook 要求补 fresh verification evidence；主线程重新运行 node/python/static selector/diff-check，并重新跑 quick browser smoke。
- 2026-05-13：fresh browser smoke 报告：`.runtime/reports/generated/browser/ai-browser-mcp-smoketest.md`；console warning/error 与 network 4xx/5xx 摘要均为空；截图清单：`.runtime/browser/mcp-artifacts/logs/screenshots-20260513-100756.txt`。
- 2026-05-13：最终 code review 发现 optional layer `null` load blocker；已修复为：manifest 有 `special_zone_layers_url` 且 load 失败时不标记 loaded cache、不清空现有 `specialZoneLayers`，追加 `special_zone_layers_load_failed` diagnostic，并用 `failedScenarioLayerAssetId` 防止 render 自动加载循环。Node 行为测试已覆盖失败后可重试和 pending layer 保留。
- 2026-05-13：lessons learned 已检查；文件里已有“Optional asset 首次保存前要保护 pending 本地状态”记录，本轮不再追加重复经验。
- 2026-05-13：补齐最终 reviewer 要求的测试证据：`special_zones_workbench_controller_behavior.test.mjs` 覆盖 render-triggered auto-load failure 不循环；`scenario_optional_layers_behavior.test.mjs` 覆盖 scenario_resources load failure 保留 runtime state；`package.json` renderer-splits 命名入口已包含新测试。最终 code-reviewer 复核 APPROVE。
- 2026-05-13：review follow-up 修复：	ools/dev_server.py scenario layer asset normalizer 保留 legendVisible:false，	ests/test_dev_server.py 覆盖保存后字段不丢失。
- 2026-05-13：review follow-up 修复：manifest 声明 special_zone_layers_url 且 asset 加载失败时，scenario_resources 显式加载和 visibility sync 都清空 stale specialZoneLayers，记录 special_zone_layers_load_failed，并标记 overlay dirty，避免跨场景污染。
- 2026-05-13：review follow-up 修复：Workbench 收到场景 layer asset 失败结果时同步清空 stale layers，触发 render，并保留 ailedScenarioLayerAssetId 防自动加载循环。
- 2026-05-13：fresh verification：
ode --test tests/scenario_optional_layers_behavior.test.mjs 2/2 pass；
ode --test tests/special_zones_workbench_controller_behavior.test.mjs 6/6 pass；
ode --test tests/special_zone_layers_state_behavior.test.mjs 6/6 pass；python -m unittest tests.test_dev_server.DevServerTest.test_save_scenario_special_zone_layers_payload_writes_layer_asset_and_updates_manifest OK；git diff --check clean。
- 2026-05-13：最终 code-reviewer 静态复核 APPROVE。
