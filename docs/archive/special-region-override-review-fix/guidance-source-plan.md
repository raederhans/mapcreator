# Guidance Source

- 用户当前目标：修复 review 指出的两个 special region 回退点。
- 直接依据：review 评论
  1. `js/ui/sidebar/water_special_region_controller.js` 需要保留 scenario special regions 的颜色编辑入口。
  2. `js/core/map_renderer.js` 需要继续渲染 `runtimeState.specialRegionOverrides`，直到迁移真正完成。
- 参考上下文：`docs/archive/special-zone-layers-workbench/context.md`
  - 其中已明确记录：legacy `specialRegionOverrides` inspector code 曾作为 compatibility surface 保留。
