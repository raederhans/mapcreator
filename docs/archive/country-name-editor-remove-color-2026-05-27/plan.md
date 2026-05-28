# 国家名称编辑器移除颜色栏目计划

## 目标
- 移除 `devScenarioCountryPanel` 内颜色输入、颜色保存按钮和颜色状态占位。
- 保留国家名称选择、英文名、中文名和保存名称功能。
- 清理 controller 中对应的颜色渲染、保存和输入绑定逻辑。
- 同步 `dist/app`，补合同测试。

## 步骤
- [x] 定位国家名称编辑器 DOM、controller 和测试入口。
- [x] 移除颜色栏目 DOM 与 controller 绑定。
- [x] 同步 `dist/app` 与 manifest。
- [x] 运行 targeted tests 和格式检查。
- [ ] 完成后归档留档。
