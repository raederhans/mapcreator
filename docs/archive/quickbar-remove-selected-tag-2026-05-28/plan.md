# Quickbar 移除当前所选按钮计划

## 目标
- 在 quickbar 的“使用选择标签”上方新增移除当前所选按钮。
- 复用开发工具中已有的移除当前选择逻辑，避免新增并行行为分支。
- 按需压缩 quickbar 按钮布局，保持底部面板宽度稳定。
- 同步 `dist/app` 与 manifest，补边界测试。

## 步骤
- [x] 定位 quickbar DOM、事件绑定和现有移除选择逻辑。
- [x] 新增按钮 DOM、事件绑定和布局样式。
- [x] 同步 `dist/app` 与 manifest。
- [x] 运行 targeted tests、语法检查和静态 token 检查。
- [ ] 完成后归档留档。
