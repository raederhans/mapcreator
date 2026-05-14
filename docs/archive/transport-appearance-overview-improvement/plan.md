# Transport Appearance Overview Improvement Plan

目标：提升 main-map transport overview 的 airport/port 图标可见性、密度、标签避让和 hover 去重；保持 road/rail、workbench preview、数据生成链现有合同。

验收：
- `npm run test:node:transport-facility-render-owner` 通过。
- `npm run test:node:transport-overview-line-contract` 通过。
- 机场/港口 atlas loading/error 有 fallback marker 与 hover entries。
- 图标尺寸保持小型像素风；tint 只做外缘描边。
- world/regional/local density 有可测差异；标签只来自 density 后 entries 并做 bbox 避让。
- country/global facility hover semantic 去重保留 country pack。

Live process owner：主线程独占所有 node test / browser smoke。
