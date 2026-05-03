# Inventory

## Source-of-truth matrix

| 资产面 | 当前 owner | 主契约 | 生成脚本 | 校验脚本/测试 | runtime consumer | 迁移状态 |
| --- | --- | --- | --- | --- | --- | --- |
| runtime asset key -> URL | `data/runtime_asset_registry.json`, `js/core/runtime_asset_registry.js` | `runtime_asset_registry` | 手工维护 | `tests/test_data_manifest_contract.py` | `data_loader`, `data_service` | 已接入 `data_service.getAsset()` |
| publish / derived data outputs | `data/manifest.json`, `init_map_data.py`, `map_builder/contracts.py` | `data/manifest.json.outputs` | `init_map_data.py` | `tests/test_data_manifest_contract.py` | startup/data loader/catalog | 已补 `schema_ref` / `simplification` / `target_zoom_range` |
| transport family manifests | `data/transport_layers/*/manifest.json` | transport manifest + path contract | 各 `tools/build_transport_workbench_*` / `build_global_transport_*` | `tools/check_transport_workbench_manifests.py`, `tests/test_transport_manifest_contracts.py` | transport workbench / overview | 已纳入 path + geometry contract |
| transport catalogs | `data/transport_layers/global_road/catalog.json`, `global_rail/catalog.json` | global transport catalog | `tools/build_global_transport_catalogs.py` | `tests/test_global_transport_builder_contracts.py` | overview context loader | 已聚合进 `CATALOG` |
| source provenance | `data/source_ledger.json` | source ledger | `tools/build_source_ledger.py` | `tools/check_source_ledger.py` | build / audit / catalog provenance | 已接入 `CATALOG.sourceId/hashRef` |
| generated thin index | `data/CATALOG.json`, `data/CATALOG.md` | `tools/build_data_catalog.py` | `tools/build_data_catalog.py` | `tools/check_data_catalog.py`, `tests/test_data_catalog_contract.py` | `data_service`, console audit | 已落地 |

## 权威边界

- `runtime_asset_registry`：runtime asset key -> URL。
- `data/manifest.json`：publish/derived artifact 的 hash、size、topology metadata。
- transport manifests：family pack / preview/full/audit/subtype path。
- `source_ledger`：原始来源、license、provenance。
- `CATALOG`：只做聚合查询入口，不反向支配上面四层。
