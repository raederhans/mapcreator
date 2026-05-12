# Plan

- [x] 建立任务留档并读取 lessons learned。
- [x] 扩展 workbench UI：当前图层 gating、成员 icon 工具、矩形 preset、当前图层样式区。
- [x] 扩展成员交互：单选/多选点击切换，刷选加入/移除，parent-group 选择无国家级退化。
- [x] 补 targeted tests / contracts。
- [x] 运行静态检查和定向测试。
- [x] 自检并记录剩余风险。

Review follow-up:
- [x] 切断 `notifyDevWorkspace()` 到 full special zone workbench refresh 的高频路径。
- [x] 为 hover/selected target 增加 current-target 小刷新入口。
- [x] 补 targeted contract，锁住 hover 路径只做 targeted refresh。
