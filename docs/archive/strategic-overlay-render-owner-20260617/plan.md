# Strategic Overlay Render Owner Plan

Last updated: 2026-06-17

## Goal

继续拆分 `js/core/map_renderer.js` 的 Strategic Overlay / Unit Counter / Operation Graphic 渲染调度，让 `map_renderer.js` 保留主渲染顺序、owner 装配和稳定 facade。

本阶段保持视觉行为、绘制顺序、公开 facade 和生产依赖不变。

## Current Evidence

- 起点分支：`codex/strategic-overlay-render-owner`
- Base commit：`0095aed6`
- `map_renderer.js` 当前约 23221 行。
- 已有 owner：
  - `strategic_overlay_helpers.js` 负责 SVG/DOM 绘制叶子函数。
  - `strategic_overlay_runtime_owner.js` 与 runtime domain 负责编辑事务、history、dirty 和 UI refresh。
  - `unit_counter_runtime_domain.js` 已拥有 place/update/delete unit counter 事务。
- 当前残留：
  - `map_renderer.js` 仍直接处理 Unit Counter drag 写事务。
  - `map_renderer.js` 仍持有 overlay signature、dirty gate 和 `render*IfNeeded` 调度。

## Target Shape

新增 owner：

```js
createStrategicOverlayRenderOwner({
  state = {},
  helpers = {},
  renderers = {},
} = {})
```

`map_renderer.js` 注入 helpers owner、runtime owner、frontline renderer、signature helper 和 projection helper。新 owner 不直接 import helper/runtime owner。

## Execution Windows

1. Unit Counter drag runtime domain
   - 在 `unit_counter_runtime_domain.js` 增加拖拽事务 API。
   - `map_renderer.js` 的 drag handler 只收集事件坐标和调用 runtime API。
   - history、dirty、attachment detach、attachedCounterIds sync、UI refresh、render request 归 runtime domain。

2. Strategic overlay render owner
   - 新增 `strategic_overlay_render_owner.js`。
   - 迁移 `last*OverlaySignature`、overlay signature 计算、dirty gate 和 `render*IfNeeded`。
   - `map_renderer.js` 保留主循环调用和薄 facade。

## Keep Out

- `renderFrontlineOverlay()` 内部绘制实现。
- Unit Counter card/model/render entry 推导。
- Operation Graphic editor 点拖拽。
- Special Zone membership drag。
- Hover、inspector、dev selection overlay owner 化。
- 性能调参、视觉样式调整、外部库评估。

## Acceptance

- Unit Counter drag 写事务不再散落在 `map_renderer.js`。
- Strategic overlay render gating 有独立 owner 和行为测试。
- Boundary contract 表达新边界。
- `map_renderer.js` 行数下降，职责更薄。
- `dist/app` 和 Pages manifest 在验证链中同步。
