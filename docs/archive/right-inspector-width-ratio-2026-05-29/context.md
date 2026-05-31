# context

2026-05-29: 用户指出右侧检查器在缩放后面积比例错误，截图里右栏看起来仍像 `340px` 抽屉宽度。无缓存 Playwright 测量当前服务时，`1267x1030` 下 `#rightSidebar` 已是 `position: relative`、`width: 288px`、`left: 979`，`#rightPanelToggle` 为 `display: none`。为避免后段响应式规则或浏览器缓存状态再次把桌面宽度推回抽屉比例，本轮补一个更靠后的 `min-width: 1024px` 桌面不变量，明确锁住右栏原始面积和比例。

2026-05-29: 已在 source 和 `dist/app` 的后段布局规则中新增 `min-width: 1024px` 桌面不变量，强制 `.sidebar-right` 回到 `position: relative`、`flex: 0 0 288px`、`width/max-width: 288px`、`transform: none`，并隐藏 `#rightPanelToggle`。静态合同同步检查 `dist/app` 的 `288px` 锁定。验证显示 `1267px` 与 `1024px` 保持常驻 `288px`，`1023px` 仍是 `340px` 抽屉。
