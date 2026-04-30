# Context

2026-04-30：用户要求继续精修右侧检查器。当前重点是字体结构统一与特殊区域面板偶发消失。实际代码以 `css/style.css`、`js/ui/sidebar/water_special_region_controller.js`、`tests/e2e/ui_rework_mainline_shell_sidebar.spec.js` 为准。

发现：全局 `.toggle-label` 和 `.select-input` 字号比检查器内部卡片级字体更大，水域与特殊区域面板继承后形成子层级过重。特殊区域面板原本按“有内容”隐藏；可选层异步加载或临时空列表会让活动场景下的面板被 `.hidden` 彻底移除。

2026-04-30 验证：字体审计确认 section 标题 13.76px、卡片标题 12.48px、控制项 11.84px、meta 10.88px、mini label 10.56px。特殊区域在 toggle off 后仍为 `hidden=false`、`display=flex`、listHeight=162。控制台仅出现既有场景/physical 警告，无 network failure。

2026-04-30 review 后修正：specialRegion 空态改为按“当前可见内容”判断，special region 与 relief overlay 同时关闭时，面板保持 `hidden=false`、`display=flex`、`is-empty-scenario-panel=true`。截图：`.runtime/browser/mcp-artifacts/inspector-typography-audit/special-region-all-content-off-empty-visible.png`。
