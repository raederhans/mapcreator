# Special Zones Editor 改进执行计划

## 目标

收口当前 Special Zones Workbench WIP：`runtimeState.specialZoneLayers` 是主模型；legacy `special_zone_editor/manualSpecialZones/styleConfig.specialZones` 只保留兼容读取与 diagnostics；Workbench 负责图层、成员、样式、全局 overlay 可见性和 scenario layer asset 保存。

## 本轮执行边界

- [x] Phase 0：重置计划基线，把上一轮已落地内容标为待复核，并把 Phase D 能力扩张保留到后续 sprint。
- [x] Phase 1：同步合同与 stale E2E selector，legacy drawing UI 退出主路径。
- [x] Phase 2：补齐 Workbench dirty/render/tool UI/toast 回调，迁入全局 `showSpecialZones` overlay toggle。
- [x] Phase 3：新增 topology fingerprint helper，并把 scenario/project normalize 路径接入 mismatch diagnostics。
- [x] Phase 4：保留成员 drawer/legend UX 收口，补本轮 CSS 与测试护栏。
- [x] Final：review-查 bug-第一性原理复核与 targeted 验收。

## Phase D 后续 sprint

- `specialRegionOverrides` 完全退役。
- 批量导入、集合运算、Story mode。
- LegendManager 抽象下沉。
- 性能 profile 与 200+ members 的专门 benchmark。

## 验收命令

```powershell
node --check js/core/special_zone_layers.js
node --check js/core/file_manager.js
node --check js/core/history_manager.js
node --check js/core/interaction_funnel.js
node --check js/ui/toolbar/special_zone_editor.js
node --check js/ui/toolbar/special_zones_workbench_controller.js
node --check js/ui/toolbar.js
node --check js/core/scenario_resources.js

node --test tests/special_zone_layers_state_behavior.test.mjs
node --test tests/file_manager_project_roundtrip_behavior.test.mjs
node --test tests/special_zones_workbench_controller_behavior.test.mjs

python -m unittest tests.test_toolbar_split_boundary_contract tests.test_history_manager_strategic_overlay_contract tests.test_project_support_diagnostics_sidebar_boundary_contract tests.test_map_renderer_special_zone_layers_render_owner_boundary_contract

node --check tests/e2e/project_save_load_roundtrip.spec.js
node --check tests/e2e/ui_rework_support_transport_hardening.spec.js
rg -n "toggleSpecialZones|specialZoneTypeSelect" tests/e2e js/ui js/core index.html css/style.css -S
```

## 执行约束

- 主线程独占 live tests/browser。
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 由主线程串行集成。
- 本轮不改 README、不加依赖、不创建 worktree。
