# TNO 数据总审计上下文

- 任务开始时间：2026-05-01
- 当前目标：完成 read-only 总审计并输出问题清单。
- 已知用户线索：地块消失、海洋地块重叠、湖泊地块重叠、fallback 地块计算错误。
- 方法：systematic debugging + code review + ultraqa 风格验证循环。

## 关键发现
- 已证实真实缺陷：6 个 political.detail.country.* chunk 混入错误国家地块，根因是 tools/scenario_chunk_assets.py 用顶层 feature.id 先于 properties.id 做身份选择。
- 已证实真实缺陷：4 个国家 detail chunk 的 detail_chunks.manifest.json feature_count 小于实际 payload feature 数。
- 已证实结构缺陷：chunk generator 会优先吃 startup_topology_url，而 tno_1962 的 startup/bootstrap topology 只有 58 个 political shell feature；当前 checked-in coarse chunk 却是 12869 个 feature，说明生成链与已发布资产分叉。
- 已证实 gate 盲区：check_scenario_contracts.py --strict 只校验 chunk feature id 属于 runtime union，没有反向校验 full runtime ids 是否被 chunks 覆盖，也没有校验 per-chunk 国家归属或 manifest feature_count 真值。
- 已证实诊断漂移：manifest.json 生成时间为 2026-04-13，audit.json 为 2026-03-28，且 water count 122 vs 123 不一致；前端会加载 audit.json 展示诊断。
- 当前未复现：checked-in runtime_topology.topo.json / water_regions.geojson 的海洋与湖泊 overlap。validate_tno_water_geometries.py 当前报告为 ok，但它没有覆盖 bootstrap topology 与 startup bundles。

## 已执行验证
- python tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --strict --report-path .runtime/reports/generated/tno_1962_contract_audit.json
- python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962_water_geometry_audit.json
- python tools/audit_startup_bundle_family.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962_startup_bundle_family_audit.json
- python tools/audit_startup_support_family.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962_startup_support_family_audit.json
- node --test tests/scenario_chunk_contracts.test.mjs
- python -m unittest tests.test_tno_water_geometries tests.test_check_hoi4_scenario_bundle tests.test_scenario_chunk_assets -q
