# 地块数据架构审计报告

## 结论

本轮只读审计发现：当前地块数据链路可以追到来源，但维护风险已经偏高。核心问题是同一类地块数据在运行时存在多套来源、多条 fallback、多层 manifest/hash 记录，导致损坏或过期数据容易被“还能显示”的恢复路径遮住。

## 已证实问题

### 1. `data/manifest.json` 已过期

短脚本核对 `data/manifest.json.outputs[*].size_bytes / sha256` 与真实文件，发现 5 个漂移项：

- `geo_aliases.json`：size 一致，sha256 不一致。
- `locales.json`：manifest `8259211` bytes，实际 `8631198` bytes。
- `palette-maps/tno.map.json`：manifest `34233` bytes，实际 `40810` bytes。
- `palette-maps/tno.audit.json`：manifest `160744` bytes，实际 `169866` bytes。
- `js/core/city_lights_historical_1930_asset.js`：manifest `227059` bytes，实际 `283760` bytes。

证据：`.runtime/tmp/land-data-audit/check_manifest_hashes.py` 输出 `manifest issues 9`。

影响：完整性校验、缓存失效、发布体积判断会读取陈旧元数据。

### 2. strict scenario contract 当前红灯

命令：`python tools/check_scenario_contracts.py --strict --report-path .runtime/tmp/land-data-audit/scenario_contract_report.json`

结果：

- `blank_base` 缺 `data/scenarios/blank_base/runtime_topology.topo.json`
- `modern_world` 缺 `data/scenarios/modern_world/runtime_topology.topo.json`
- `hoi4_1936`、`hoi4_1939`、`tno_1962` 通过

证据：`.runtime/tmp/land-data-audit/scenario_contract_report.json`。

影响：严格发布契约把所有 scenario 都按同一 runtime topology 必需项检查，但 `blank_base` 和 `modern_world` 真实产物缺口没有被日常运行路径前置暴露。

### 3. `hoi4_1939` startup shell 真相源分裂

子代理复核到：

- `data/scenarios/hoi4_1939/manifest.json` 的 `runtime_bootstrap_topology_url` / `startup_topology_url` 指向 `runtime_topology.bootstrap.topo.json`，约 46MB。
- `startup.bundle.*.json` 记录的 `runtime_bootstrap_topology_sha256` 指向 `startup.runtime_shell.topo.json`，约 337 bytes。
- 代码来源：`tools/build_hoi4_scenario.py` 生成 shell 后传给 startup bundle，又把 manifest URL 写回 full bootstrap topology。

影响：startup bundle 内嵌轻量 shell，recovery/fallback 路径按 manifest 可能读取 46MB 大 topology；同一场景的 source hash 和公开 URL 指向不同实体。

### 4. detail topology 存在多源 fallback，会掩盖 `na_v2` 损坏

证据：

- `js/core/data_loader.js:25-31`：`DETAIL_SOURCES` 包含 `highres`、`legacy_bak`、`na_v1`、`na_v2`。
- `js/core/data_loader.js:31`：fallback 顺序为 `na_v2 -> na_v1 -> legacy_bak -> highres`。
- `js/core/scenario_manager.js:151` 也保留同样 fallback 顺序。

影响：默认应该以 `na_v2` 为当前 detail 真相源，但 `na_v1`、`.bak`、`highres` 仍可被自动选中。地块精度、feature ids、边界可能在不同环境漂移。

### 5. full scenario runtime topology 在 bundle loader 中仍按 optional 记录

证据：

- `js/core/scenario/bundle_loader.js:676` 通过 `loadOptionalScenarioResource(...)` 读取 runtime topology。
- `js/core/scenario/bundle_loader.js:813-819` 将 `runtime_topology` 写入 `optionalResources`。
- `js/core/scenario/bundle_loader.js:848-855` required resources 只记录 countries/owners/controllers/cores。

影响：full bundle 的 `runtime_topology.topo.json` 缺失或损坏时，bundle 仍可能组装成功，错误延后到运行态恢复路径。

### 6. active scenario 下仍有隐式 display fallback

证据：

- `js/core/scenario/startup_hydration.js:216-218`：场景 runtime topology 不可渲染时会退到 `state.defaultRuntimePoliticalTopology || state.runtimePoliticalTopology`。
- `js/core/scenario_apply_pipeline.js:307-310`：controllers 缺失时使用 owners。
- `js/core/scenario_runtime_queries.js:61-67`：controller 查询 fallback 到 owner。
- `js/core/map_renderer.js:6117-6120`、`js/core/map_renderer.js:6871-6888`：display/border owner fallback 到 feature 自带 country code。

影响：构建期 strict contract 很硬，运行时 display contract 更宽。某些 owner/controller 缺失可能被 UI 看起来“正常”的显示兜底盖住。

### 7. Pages 发布清单会保留 `audit_url` 断链

证据：

- `data/scenarios/index.json` 和各 scenario manifest 暴露 `audit_url`。
- `tools/build_pages_dist.py:78-79` 定义 `SCENARIO_EXCLUDED_FILE_NAMES = {"audit.json"}`。
- `tools/build_pages_dist.py:188-189` 复制 scenario 时跳过 `audit.json`。

影响：Pages 上 manifest 仍指向 `audit.json`，发布产物里文件缺失，外部工具或调试 UI 按 URL 拉取会 404。

### 8. Pages scenario 发布仍按目录过滤，边界粗

证据：`tools/build_pages_dist.py:180-192` 递归复制 `data/scenarios`，只排除 `derived` 和 `audit.json`。

影响：authoring partial、manual override、诊断或镜像文件有机会随目录结构进入发布包。当前 Pages 主要靠文件名/目录名排除，缺少 manifest runtime URL allowlist。

### 9. topology 精度设置被 4 位小数预圆整削弱

证据：

- `map_builder/config.py:642-643`：detail/runtime quantization 是 `100_000`。
- `map_builder/geo/utils.py:29-44`：`round_geometries(... precision=4)` 默认 4 位小数。
- `map_builder/geo/topology.py:429-432`、`631-632`：进入 TopoJSON 前统一 round，再 scrub。

影响：detail/runtime 虽然设置更高 quantization，但前置 rounding 已经把坐标压到约 0.0001 度，窄边界、小岛和 shell fragment 会先发生不可逆漂移。

### 10. TopoJSON quantization 失败会自动无量化重试

证据：`map_builder/geo/topology.py:458-466` 捕获异常后打印 `retrying without quantization`，继续输出。

影响：生产构建的 topology mode 可能从 quantized 变成 unquantized，文件大小、arc sharing、坐标精度会变，但 manifest/contract 没记录这个模式切换。

### 11. 几何 repair/scrub 会丢弃损坏 geometry，缺少按 layer 的丢弃审计

证据：

- `map_builder/geo/topology.py:222-241`：`_repair_geometry` 失败返回 `None`。
- `map_builder/geo/topology.py:375-390`：`scrub_geometry` 过滤 `None`、empty、invalid geometry。

影响：政治地块、水域、特殊区域如果有损坏对象，构建可能直接少对象；当前缺少 feature id、layer、drop reason 的集中报告。

### 12. chunk manifest byte size 当前健康，但 strict contract 缺 chunk 完整性门

证据：

- 本轮脚本扫描 `detail_chunks.manifest.json`，`byte_mismatch_count = 0`。
- `map_builder/contracts.py:506-512` 的 strict required files 只包含 manifest、owners/controllers/cores、`runtime_topology.topo.json`。
- `tools/check_scenario_contracts.py:527-668` 未检查 chunk manifest 指向文件、chunk ids 与 runtime ids 的关系。

影响：已知 `byte_size` 漂移本轮未复现，但 chunk 文件缺失、chunk feature ids 越界、bootstrap/full/chunk 不一致仍缺少统一门禁。

### 13. `runtime topology version tag` 身份太弱

证据：

- `tools/build_startup_bundle.py:689-699` 已记录 `base_topology_sha256`、`runtime_topology_sha256`、`runtime_bootstrap_topology_sha256`。
- `js/core/scenario/startup_hydration.js:146-154` 的 runtime tag 只用 `scenarioId + baselineHash + runtimeFeatureCount`。
- overlay consistency 主要比较 version tag。

影响：bootstrap、full runtime、chunk-merged 只要 feature count 相同，就可能共享同一 tag，source drift 不容易被 health gate 捕获。

### 14. `scenario_manager.js` 残留旧 bundle loader 职责

证据：

- `js/core/scenario_manager.js:408-470`：保留 `createScenarioBootstrapBundleFromCache()`。
- `js/core/scenario_manager.js:502-541`：保留 `loadScenarioRuntimeTopologyForBundle()`。
- `js/core/scenario/bundle_loader.js:407-502`、`647-685` 已有同类 bundle assembly/resource load 实现。

影响：split 后存在双实现面，后续维护者可能把修复补到旧路径。

### 15. 大型重复/源数据对仓库和扫描造成负担

本轮重复 hash 扫描发现：

- `industrial_zones.open.geojson` 与 `industrial_zones.open.preview.geojson` 完全重复，各约 52.54MB。
- `industrial_zones.internal.geojson` 与 `industrial_zones.internal.preview.geojson` 完全重复，各约 19.74MB。
- `mineral_resources.geojson` 与 `mineral_resources.preview.geojson` 完全重复，各约 11.11MB。
- `logistics_hubs.geojson` 与 `logistics_hubs.preview.geojson` 完全重复，各约 5.93MB。
- `hoi4_1936/runtime_topology.topo.json` 与 `hoi4_1939/runtime_topology.topo.json` 完全重复，各约 42.95MB。

`data/` 顶层还有本地巨型 source cache：

- `PROBAV_LC100_global_v3.0.1_2019_discrete.tif`：约 1634MB。
- `PROBAV_LC100_global_v3.0.1_2019_forest_type.tif`：约 990MB。
- `ETOPO_2022_v1_60s_N90W180_surface.tif`：约 444MB。

`.gitignore` 已覆盖这些 tif/tmp 文件，发布风险较低，但本地扫描、备份、杀毒、全目录 grep 会受影响。

### 16. `europe_topology.*` 族的版本语义混杂

本轮 inventory：

- `europe_topology.json`：209 political geometries，4.64MB。
- `europe_topology.highres.json`：8667 political geometries，6.63MB。
- `europe_topology.na_v1.json`：10542 political geometries，8.17MB。
- `europe_topology.na_v2.json`：22527 political geometries，18.35MB。
- `europe_topology.runtime_political_v1.json`：22502 political geometries，14.96MB。
- `europe_topology.json.bak`：6.43MB，仍被 detail fallback 引用。

影响：文件名里的 `europe`、`na`、`highres`、`runtime_political` 混合表达地域、阶段、精度、运行时角色。维护者需要读多处代码才能知道哪个是主线。

## 建议推进顺序

1. 修正已漂移数据：更新 `data/manifest.json`，修 `hoi4_1939` startup shell URL/hash，处理 Pages `audit_url` 断链。
2. 收紧运行时契约：full scenario bundle 必须加载合法 `runtime_topology.topo.json`，active scenario political topology 失败进入明确错误状态。
3. 收口 topology identity：把 runtime tag 升级为 topology epoch，包含 full/bootstrap/chunk/source sha。
4. 收口 fallback：集中 reason code，限制 detail fallback 只在显式 dev/debug 场景启用。
5. 补数据质量门：chunk manifest 完整性、geometry drop audit、quantization mode 记录、runtime/strict display policy 对齐。
6. 做数据瘦身：清理 `.bak`、重复 preview/full 文件、tracked raw/source 负担；巨型 local source cache 迁到 `.runtime/source-cache` 或外部缓存。

## 本轮验证

- `python .runtime/tmp/land-data-audit/audit_inventory.py`
- `python .runtime/tmp/land-data-audit/check_manifest_hashes.py`
- `python .runtime/tmp/land-data-audit/check_source_ledger_hashes.py`
- `python .runtime/tmp/land-data-audit/find_large_duplicates.py`
- `python .runtime/tmp/land-data-audit/scenario_counts.py`
- `python tools/check_scenario_contracts.py --strict --report-path .runtime/tmp/land-data-audit/scenario_contract_report.json`
- 多子代理只读审计：explore、architect、code-reviewer、debugger

## 子代理复核结论

- code-review：`REQUEST CHANGES`，最高风险是 full runtime topology optional、Pages scenario 边界粗、detail fallback 隐藏损坏、precision/quantization/scrub 缺门禁。
- architect：`BLOCK`，核心风险是 topology identity 太弱、fallback/recovery 分散、strict contract 与 runtime display fallback 强度不一致。
- debugger：确认 3 个可复现问题：`data/manifest.json` 漂移、`hoi4_1939` startup shell 真相源分裂、Pages `audit_url` 断链；确认 chunk byte_size 当前干净。
- explore：确认 `europe_topology`、`runtime_political`、scenario runtime/chunk/startup 链路可追踪，但 `na_v1/bak/highres/na_v2` 与 startup/场景 fallback 叠加构成治理风险。
