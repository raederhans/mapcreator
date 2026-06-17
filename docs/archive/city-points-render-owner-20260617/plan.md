# City Points Render Owner Plan

Last updated: 2026-06-17

## Goal

把 `js/core/map_renderer.js` 中 city points / marker / label pass / hover 的渲染职责抽到 `js/core/renderer/city_points_render_owner.js`，让 `map_renderer.js` 保留稳定 facade 和薄委托。

本阶段不改变视觉行为、绘制顺序、交互 hit 语义和现有公开 facade 名称。

## Current Evidence

- `map_renderer.js` 当前约 23542 行，city points 重点区域集中在 `12321-14230`。
- 已有 owner 边界：
  - `urban_city_policy.js` 拥有城市集合合并、urban runtime 匹配、reveal plan。
  - `city_label_owner.js` 拥有 label canvas 绘制。
  - `city_lights_render_owner.js` 拥有 city lights 渲染。
  - `facility_surface.js` 拥有 facility tooltip/card DOM。
- 当前 city points 仍在 `map_renderer.js` 中持有 marker sprite cache、visible hover cache、city layer render state、marker 绘制、city points layer 绘制和 labels pass 编排。
- 当前 hover 逻辑有一个高风险点：`getHoveredCityEntryFromEvent` 使用 `bestPriority`，需要在 owner 行为测试里锁住优先级和无异常路径。

## Target Shape

新增 owner:

```js
createCityPointsRenderOwner({
  state = {},
  constants = {},
  getters = {},
  helpers = {},
} = {})
```

`map_renderer.js` 新增 `getCityPointsRenderOwner()`，注入 runtime state、canvas/projection getter、city label owner 委托、urban policy facade、facility hover helper、render perf metric helper，以及样式/颜色/限制类 helper。

## Move

- `getCityLayerRenderState`
- `drawCityMarkersFromEntries`
- `drawCityPointsLayer` 的主体逻辑
- `drawLabelsPass` 中 city marker + city label 编排主体
- marker sprite canvas/spec/render/cache helper
- visible city hover cache 和 hovered city tooltip entry 逻辑

## Keep As Thin Delegates

- `drawCityPointsLayer(k, options)`
- `drawLabelsPass(k, options)`
- `getHoveredCityEntryFromEvent(event)`
- `getHoveredCityTooltipEntry(event, hit)`
- `getCityLayerRenderState(k, options)`
- existing facade exports for city policy/style helpers

## Risk Order

- Green: marker sprite helper、size/style 纯计算、skip metric reason。
- Yellow: reveal budget entries、label budget、marker cache revision、hover cache。
- Red: draw order、interaction hit 优先级、shared runtime state、Pages dist mirror。

## Execution Steps

1. 建 owner 壳和行为测试。
2. 迁移 marker sprite helper、city layer render state、marker drawing。
3. 迁移 city points layer、labels pass 编排和 hover 逻辑。
4. 保留 `map_renderer.js` 薄委托，更新边界契约测试。
5. 运行 node owner behavior、Python boundary、node syntax checks。
6. 运行 city e2e、layer smoke、Pages dist 等价验证。
7. 执行 code-review / architect 复核，修复发现问题。
8. 提交、整合回 `main`、推送并更新注册表。

## Acceptance

- `map_renderer.js` 行数下降，city points 渲染主体进入新 owner。
- city label owner 和 urban city policy owner 边界保持清晰。
- city hover priority 有行为测试覆盖。
- city render e2e、layer smoke、Pages dist 验证通过或失败原因有日志证据。
- `dist/app` mirror 与 source 保持一致。
