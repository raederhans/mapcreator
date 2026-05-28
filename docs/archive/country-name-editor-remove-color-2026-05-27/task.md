# 国家名称编辑器移除颜色栏目任务

## 验收标准
- [x] `devScenarioCountryPanel` 不再渲染 `devScenarioCountryColorInput`、`devScenarioSaveCountryColorBtn`、`devScenarioCountryColorStatus`。
- [x] controller 不再 query、render 或 bind 国家颜色编辑器。
- [x] 已删除无入口使用的国家颜色编辑 helper。
- [x] `devScenarioCountryEditor` 默认状态不再保留颜色字段。
- [x] 国家名称保存路径保留。
- [x] `dist/app` 与 manifest 同步。
- [x] targeted tests 通过。
