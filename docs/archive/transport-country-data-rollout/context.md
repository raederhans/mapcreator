# Transport country data rollout context

工作目录：`C:\Users\raede\.codex\worktrees\transport-country-data-rollout\mapcreator`

当前 live process owner：主线程独占所有测试、构建、Pages dist 和 manifest checker；子代理只做静态审计、官方源链复核和测试策略复核。

本轮修正：
- 上一轮 7 个 country pack 被确认为错误产物：`germany_road`、`uk_road`、`france_rail`、`usa_airport`、`china_airport`、`russia_airport`、`india_airport` 都来自 checked-in global transport / Natural Earth clip，而真实源计划要求官方源或官方名单 + OSM coordinate supplement。
- 已删除 7 个错误 pack 目录。
- 已删除错误 helper：`map_builder/country_transport_pack_builder.py`、`tools/build_transport_workbench_country_batch.py`。
- 已回滚错误 pack 带来的 `data/manifest.json`、`data/runtime_asset_registry.json`、`data/CATALOG.*`、`dist/pages-dist-manifest.json`、Pages dist size gate 和 catalog/pages 测试计数改动。
- 新增真实源 contract：`map_builder/transport_country_real_source_contracts.py`。
- 新增 source gate：`tools/check_transport_country_sources.py`。它只接受 `.runtime/source-cache/transport/<pack_id>/...` 中的真实源文件，缺源时直接失败并打印路径与 URL。
- 新增专项回归：`tests/test_transport_country_source_contracts.py`，覆盖真实源规格、source_signature 来源和 forbidden backend token。

真实源边界：
- Germany road：BKG DLM250 compact 是几何主源。
- UK road：GB 使用 OS Open Roads；NI 使用 OSNI 50K Transport Lines；输出保留 `source_region` 边界。
- France rail：SNCF RFN lines 是线路主源；SNCF/RFN stations 是主要站点源。
- USA airport：FAA NASR APT 是点位和对象主源；FAA passenger/all-cargo 数据只做重要度筛选。
- China airport：CAAC 决定大陆对象范围和重要度；Taiwan 官方/open points 负责台湾点位；OSM 只补官方对象坐标。
- Russia airport：Rosaviatsiya registry 决定对象范围；OSM 只补已注册对象坐标。
- India airport：AAI 名录和 traffic report 决定对象范围与 preview；OSM 只补 AAI 对象坐标。

当前 blocker：
- `.runtime/source-cache/transport/...` 还没有 7 个 pack 所需的官方源文件。本轮正确状态是 source gate 红灯，不能生成或提交 pack。
- 下一步要先把官方源文件缓存到 source gate 打印的路径，然后逐个实现真实源 parser 和 pack writer。

验证记录（2026-05-12）：
- `python -m py_compile map_builder\transport_country_real_source_contracts.py tools\check_transport_country_sources.py tests\test_transport_country_source_contracts.py` 通过。
- `python tools\check_transport_country_sources.py --pack uk_road --report-path .runtime\reports\generated\transport-country-source-check-uk-road.json` 按预期红灯，输出 OS Open Roads 和 OSNI 缺失缓存路径。
- `python tools\check_transport_workbench_manifests.py` 通过。
- `python tools\build_pages_dist.py` 通过，dist total 972.05 MiB / max 980 MiB。
- `python -m unittest tests.test_transport_country_source_contracts tests.test_transport_manifest_contracts tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_pages_dist_startup_shell tests.test_transport_workbench_manifest_runtime_contract` 通过，52 tests。

当前执行到：真实源修正的撤回与 source gate 阶段完成。
剩余工作：缓存官方源原始文件，实现逐源 parser，生成真实 pack，注册 catalog/runtime/Pages，并跑完整 Pages/runtime 验收。

## 2026-05-12 execution update
- ultrawork execution active in transport-country-data-rollout worktree.
- Main thread owns live downloads/builds/tests. Current live process: python tools/download_transport_country_sources.py, session 37216, report target .runtime/reports/generated/transport-country-source-downloads.json.
- Subagents Fermat/Hilbert supplied static reuse map and official URL verification only; they do not own live processes.
- Source specs updated to current official direct URLs for BKG, OS Open Roads, OSNI, SNCF, FAA NASR/enplanements, CAAC 2025, Rosaviatsiya HTML registry, AAI pages/PDF.


## 2026-05-12 build update
- Source cache gate passed for all seven target packs after official direct downloads and Overpass coordinate supplements.
- Current live process: python tools/build_transport_country_real_packs.py, session 95802. Main thread owns this builder.


## 2026-05-12 verification update
- Built all seven real-source packs under data/transport_layers: germany_road, uk_road, france_rail, usa_airport, china_airport, russia_airport, india_airport.
- Source cache gate: python tools/check_transport_country_sources.py --report-path .runtime/reports/generated/transport-country-source-check.json -> OK.
- Manifest gate: python tools/check_transport_workbench_manifests.py -> OK.
- Unit gates: 52 targeted unittest cases passed across country source, transport manifest, data manifest/catalog, Pages shell, and runtime manifest contract.
- Pages gate: python tools/build_pages_dist.py -> total size 988.62 MiB under the updated 995 MiB limit.
- git diff --check returned only CRLF conversion warnings for generated/edited text files.


## 2026-05-12 review closeout
- Code-reviewer found four blockers: broad OSM matching, China Taiwan source not parsed, India traffic source not participating in preview, Russia/India preview fallback.
- Fixed with exact IATA/ICAO/name alias matching, duplicate-coordinate fail-fast, Taiwan CAA telephone table parsing, India traffic-report major-airport order, and preview fail-fast.
- Reviewer recheck: blockers 0, recommendation COMMENT.
- Final fresh verification: 52 unittest cases OK; source gate OK; transport manifest gate OK; Pages dist 988.60 MiB under 995 MiB; git diff --check only CRLF conversion warnings.

