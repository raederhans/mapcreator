# 剧本标签创建器紧凑布局计划

## 目标
- 压缩 `devScenarioTagCreatorPanel` 在底部 dock 中的竖向占用。
- 保留标签创建、颜色、检查器分组、清空和创建按钮的现有数据流。
- 同步 `dist/app`，补静态合同，避免交付面和源码面分叉。

## 步骤
- [x] 定位标签创建器 DOM、controller 和样式入口。
- [x] 将标签创建器标题区、元信息、字段区和按钮区重排为紧凑结构。
- [x] 添加 scoped CSS，限制色板和元信息的竖向占高。
- [x] 同步 `dist/app` 与 manifest。
- [x] 运行 targeted tests、自检和格式检查。
- [x] 完成后归档留档。
