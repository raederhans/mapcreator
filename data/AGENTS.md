# data 目录贡献规则

## 治理域范围

当前 data health 只检查已经纳入治理面的入口：
- `data/CATALOG.json` 与 `data/CATALOG.md`
- `data/runtime_asset_registry.json`
- `data/transport_layers/*/manifest.json` 及其 `paths` / `variants.*.paths`
- catalog 化 scenario 入口 `data/scenarios/index.json`

`data/**` 里还有大量源缓存、生成中间物和历史材料。新增数据时优先把真实 runtime / transport / scenario 入口接入上面的治理域；`manifest.json` 与 `source_ledger.json` 继续作为 catalog 来源材料参与生成流程。

## 数据贡献步骤

1. 先确定数据属于哪个入口：runtime asset、manifest output、source ledger、transport pack、scenario registry。
2. 把文件放到稳定路径，路径使用 repo 相对路径和 `/` 分隔符，例如 `data/transport_layers/japan_road/roads.topo.json`。
3. 在对应 owner 文件登记：
   - runtime 读取入口登记到 `runtime_asset_registry.json`
   - 构建输出登记到 `manifest.json`
   - source 本地镜像登记到 `source_ledger.json`
   - transport 家族登记到自己的 `transport_layers/*/manifest.json`
   - scenario 列表入口保持 `scenarios/index.json`
4. 重新生成 catalog：`python tools/build_data_catalog.py`。
5. 跑短检查：`python tools/data_health.py` 和 `python -m unittest tests.test_data_catalog_contract`。

## 常见错误

- 只新增文件，忘记接入 catalog 来源入口，导致 runtime 或构建链找不到它。
- transport manifest 的 `paths` 指向缺失文件、非 JSON/GeoJSON/TopoJSON 文件，或路径跑出 `data/`。
- 同一个 URL 在 catalog 中被多个 key 重复声明。
- `schemaRef` 留空，导致下游无法判断数据契约。
- scenario 子树新增入口时绕过 `scenario_registry`，让 scenario picker 和 startup 入口分裂。
- 大文件进入治理域时缺少说明；health 会报告 warning，是否接受体积由负责该数据域的 owner 决定。
