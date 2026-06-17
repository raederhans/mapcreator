# Strategic Overlay Cleanup Followups Plan

Last updated: 2026-06-17

## Goal

推进 strategic overlay render owner 拆分后的两个后续清理点，保持视觉行为和公开 facade 稳定。

## Scope

1. Operation Graphic vertex drag session
   - 将拖拽 `before` snapshot 和会话状态从 D3 datum 移到 `operation_graphics_runtime_domain.js` 的私有 session。
   - `map_renderer.js` 的 drag handler 只负责事件坐标、DOM cursor 和调用 runtime owner API。
   - history、dirty、UI refresh、render request 归 runtime domain。

2. Overlay dirty ownership
   - `strategic_overlay_render_owner.js` 只处理 strategic overlays：frontline、operational lines、operation graphics、unit counters、special zones。
   - inspector / hover dirty flags 回到 `map_renderer.js` 的薄 facade。

## Keep Out

- Operation Graphic midpoint insert transaction owner 化。
- Operation Graphic render leaf drawing迁移。
- Inspector / hover render owner 化。
- 新通用 overlay scheduler。
- 浏览器视觉重测，除非 targeted tests 暴露行为风险。

## Acceptance

- Operation Graphic drag 不向业务 datum、graphic 或 history 快照写入内部 session 字段。
- Render owner API 和边界测试表达 strategic-only dirty ownership。
- `map_renderer.js` 继续保留主装配和 facade。
- Runtime/render owner behavior tests 和 Python boundary contracts 通过。
- `dist/app` 通过 Pages dist 验证同步。
