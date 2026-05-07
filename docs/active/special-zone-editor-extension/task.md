# Special Zone Editor Extension

目标：落地特殊区域编辑器的拓展与 UI 精简方案。

范围：
- 成员编辑绑定当前图层。
- 成员工具收成紧凑 icon：单选、多选、刷选。
- 成员选择只支持当前地块和上级分组；无上级时只处理当前地块。
- 样式模板使用矩形预览卡，点击即应用到当前图层。
- 当前图层样式逐项编辑。
- 旧手绘入口退出用户编辑路径。

验证：
- `node --check` 覆盖修改的 JS 文件。
- targeted special zone state / contract tests 通过。
- 手工检查工作台主流程没有明显 UI 误导。
