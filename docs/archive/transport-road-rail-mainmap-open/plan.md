# 外观交通 Road/Rail 主图开放执行计划

## 目标

- 修复 `showRoad` 在 project 保存、恢复、导入加载中的缺口。
- 让 road/rail 的 `scope` 和 `threshold` 在 world/regional 缩放下继续决定元素数量。
- 新增低密度 rail 粗补区域，消除非重点区域视觉硬截断。
- 保持 road/rail Workbench `Apply to Main Map` 关闭，本轮只开放外观面板主图可见性。

## 验收清单

- `layerVisibility.showRoad` 可保存、可恢复；旧项目缺省恢复为 `false`。
- 导入项目后，`showTransport && showRoad` 会触发 `ensureContextLayerDataFn("roads")`。
- `resolveTransportOverviewLineStrategy()` 的 visual mode 只影响显示强度，数量仍由 scope/threshold 控制。
- `global_rail/catalog.json` 覆盖说明更新为 focus + coarse gap regions。
- 新增 rail 粗补 region：`south_america`、`africa_middle_east`、`south_southeast_asia_oceania`。
- runtime/Pages 只发布 `.preview.` 数据；full pack 保持构建产物，不进入主图加载链。

## 验证命令

- `python -m unittest tests.test_global_transport_builder_contracts -q`
- `python -m unittest tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract -q`
- `python tools/check_transport_workbench_manifests.py --root data/transport_layers`
- `python -m unittest tests.test_pages_dist_startup_shell -q`

## 边界

- Road 数据本轮不重建，沿用 checked-in catalog/preview shard。
- Workbench road/rail bridge 继续返回 `supported: false`。
- 不触碰当前主仓已有 TNO 脏改；所有实现发生在本 worktree 分支。
