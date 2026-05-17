# Context

- 2026-05-17：开始执行。当前分支是 `main`，本地比 `origin/main` ahead 1，初始 `git status --short --branch` 没有未提交文件。
- 已读 `lessons learned.md`、`docs/shared/agent-tiers.md`、相关 memory、`transport_overview_render_owner.js`、`transport_facility_icons.js`、`state_defaults.js`、`ui_state.js`、`appearance_controls_controller.js`、`map_renderer.js` 和现有 tests。
- 已知事实：机场/港口标签已有 density、bbox placement、atlas fallback、hover semantic dedupe；缺口集中在 label size/halo 可配置、长名自适应缩短、默认图标对比度、facility 命中时底层地块选择隔离。
- Live process owner：主线程。子代理 Pauli/Carver 只做静态分析和测试建议，禁止运行或监控 live tests。
- 当前计划执行到：完成 live context 读取，准备修改配置/UI/renderer/interaction/tests。
- 已完成实现：airport/port 默认 labelMode 改为 adaptive，新增 labelSize/labelHalo 配置和外观面板滑杆；port 获得同样的标签配置面。
- 已完成实现：facility label 会结合缩放、名称长度、字体大小和重要级别决定短码/短名/完整名；facility icon 增强尺寸、外圈和 alpha 下限。
- 已完成实现：Transport 面板新增 `Allow Underlying Map Selection`。默认点击/hover airport/port 会清掉底层 land/water/special/dev hover 并拦截底层点击；打开该开关后允许穿透。
- Review 修复：补了 behavior-level `facility_surface_selection_behavior.test.mjs`，覆盖默认拦截、开关放行、hover clear patch；把 UI copy 从 land selection 改成 underlying map selection，避免语义偏窄。
- 自检修复：压缩机场/港口名称时保留原始名称兜底，避免只剩通用词的名称被压成空标签。
- 验证通过：`node --test tests\facility_surface_selection_behavior.test.mjs`、`node --test tests\transport_facility_render_owner_behavior.test.mjs`、`node --test tests\transport_overview_line_strategy_scope_contract.node.test.mjs`、`python -m unittest tests.test_transport_facility_interactions_contract tests.test_map_renderer_asset_url_and_facility_surface_contract -q`、`python tools\i18n_audit.py`、`git diff --check`。
- 当前计划执行到：全部实现和 targeted verification 完成，等待最终状态清理与汇报。
