# 执行上下文

## 2026-05-06

- worktree：`C:\Users\raede\.codex\worktrees\transport-road-rail-mainmap-open\mapcreator`
- branch：`codex/transport-road-rail-mainmap-open`
- 主仓存在 unrelated TNO 脏改，本轮在独立 worktree 内执行。
- 已读取 `lessons learned.md`，本轮长构建和成组测试使用后台日志或主线程串行执行。
- 已启动只读子代理：
  - road 保存/恢复/导入合同复核
  - rail builder/catalog/Pages 合同复核
  - line strategy 行为测试设计复核

## 当前事实

- road UI toggle 已经能在手动点击时调用 `ensureContextLayerDataFn("roads")`。
- project save/load 未写入 `showRoad`，import restore 未恢复 `showRoad`。
- project import 只在 `showRail` 为真时加载 rail，缺少 road 对称加载。
- line strategy 当前在 world/regional 缩放下把 scope/threshold rank 抬到 `2`，导致 primary/mainline_only/motorway_only 数量限制被放宽。
- rail catalog 当前覆盖语义是 `focus_regions_only`，需要扩展成 focus + coarse gap regions。

## 执行记录

- 初始化留档完成。
- 已补 `showRoad` project export/import normalize、runtime restore、project import road data load。
- 已调整 `resolveTransportOverviewLineStrategy()`，world/regional 缩放只保留宽度、透明度、标签策略变化，scope/threshold 数量门槛保持用户设置。
- 已增加 `transport_overview_line_strategy_scope_contract.node.test.mjs`，用 synthetic line fixtures 验证同缩放下 primary 与 broad 配置数量不同。
- 已新增 rail 粗补 region/shard 配置，并把 catalog coverage scope 生成语义改为 `focus_regions_plus_coarse_gap_regions`。
- 第一次 rail 构建命中真实数据源问题：`2026-02-18.0` Overture transportation segment S3 prefix 返回 0 个对象；改用当前可用的 `2026-04-15.0` 后完成构建。
- rail 粗补构建完成，preview/full 计数：
  - `sa_w082_w058`: 46 / 345
  - `sa_w058_w034`: 25 / 212
  - `ame_w020_e010`: 12 / 56
  - `ame_e010_e035`: 21 / 126
  - `ame_e035_e065`: 45 / 175
  - `ssea_e065_e095`: 50 / 496
  - `ssea_e095_e125`: 28 / 183
  - `ssea_e125_e155`: 22 / 228
  - `ssea_e155_e180`: 3 / 37
- `tools/build_global_transport_catalogs.py --family rail` 和 `tools/build_data_catalog.py` 已在后台构建脚本中完成。

## 收尾记录

- 已扩展 `showRoad` 的 project save/load/import 合同，并保持旧项目缺省恢复为 `false`。
- 已保持 road/rail workbench bridge `supported: false`，本轮只开放主图 Appearance 可见链路。
- 已确认 Pages/runtime 合同继续发布并加载 `.preview.` rail 产物，full rail pack 只作为数据产物保留。
- 已清理 `dist/` 构建输出，避免把本轮 Pages 验证生成物并入提交。
- 验证已通过：global transport builder contracts、transport manifest contracts、workbench manifest checker、transport overview line Node contract、Pages dist build、Pages dist startup shell、project save/load roundtrip targeted E2E。
- 已知外部遗留问题：`tools/data_health.py` 和 `tests.test_data_catalog_contract` 仍会因为既有 geoBoundaries source ledger 缺失文件失败，本轮未触碰该数据治理问题。
