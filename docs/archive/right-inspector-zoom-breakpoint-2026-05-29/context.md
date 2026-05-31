# context

2026-05-29: 用户指出浏览器页面缩放后，`1267px` 视口打开 app 时右侧检查器默认收起。定位到 `css/style.css` 的 `@media (max-width: 1279px)` 把 `.sidebar-right` 改成 fixed drawer，并显示 `#rightPanelToggle`。JS 的 `TABLET_WORKSPACE_MAX_WIDTH` 是 `1023`，所以 CSS 右侧抽屉断点比 JS 响应式状态宽，导致缩放后的桌面宽度被错误切到抽屉模式。当前 live server 由主线程独占：`http://127.0.0.1:8810/app/`。

2026-05-29: 已把 `.sidebar-right` fixed drawer、`body.right-drawer-open .sidebar-right`、`.panel-toggle-right` 显示规则从 `max-width: 1279px` 移到 `max-width: 1023px`。同时在 `min-width: 1024px` 禁用 drawer 遮罩，避免用户从窄屏打开抽屉后缩放回桌面宽度时留下遮罩。

2026-05-29: 子代理指出 `.panel-toggle-right` 的位置规则也应归到 `1023px` 所有权下，且 `js/ui/sidebar.js` 的侧栏折叠能力仍按 `min-width: 1280px` 生效。已把 toggle 的 `top: 76px` 移到 `max-width: 1023px`，并把左右侧栏折叠能力改成 `min-width: 1024px`，让 1024-1279px 的常驻侧栏按钮可正常使用。

2026-05-29: 浏览器验证发现 JS 状态已能切到 collapsed，但 CSS 折叠规则仍包在 `min-width: 1280px` 下，导致 1267px 点击右侧折叠按钮只改 aria 和 body class，视觉宽度不变。已把侧栏 collapsed CSS 的桌面断点改为 `min-width: 1024px`。

2026-05-29: 最终 review 发现 `dist/app/css/style.css` 缺少 collapsed 交付面样式，`tests/test_ui_rework_plan02_mainline_contract.py` 仍锁旧 `1280px` 合同。已补 `dist/app` scoped collapse block、`max-width: 1023px` 下的 collapse handle 隐藏规则，并把主线合同更新到 `1024px` 与 packaged CSS 断言。
