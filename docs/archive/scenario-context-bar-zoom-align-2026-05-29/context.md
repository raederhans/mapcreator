# context

2026-05-29: 用户在浏览器评论中指出页面缩放后 `#scenarioContextBar`（“+ 指南”）没有和右侧控件对齐。定位到 `css/style.css` 后段的 `@media (max-width: 1279px)` 对 `.scenario-context-bar` 强制 `top: 78px`，而后续同一响应式层没有同步移动右上 `#zoomControls`。当前 live server 由主线程独占，地址为 `http://127.0.0.1:8810/app/`。

2026-05-29: 已删除 source 与 packaged app 样式中 `max-width: 1279px` 对 `.scenario-context-bar` 的宽泛 `top: 78px` 覆盖，让 `1024-1279px` 回到同一组顶栏基准 `top: 16px`。review 指出 `768-1023px` 仍需要避开抽屉按钮区域，因此补回 `max-width: 1023px` 的局部 `top: 78px`；`max-width: 767px` 的手机堆叠规则继续作为最终覆盖。
