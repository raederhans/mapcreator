# 特殊区域图层工作台样式修复上下文

## 2026-05-27
- 用户指出左侧栏 `details#specialZonePopover > section.special-zone-layers-workbench` 的图层工作台视觉与其他部分不一致。
- 当前 DOM 由 `js/ui/toolbar/special_zones_workbench_controller.js` 创建，样式集中在 `css/style.css` 的 `.special-zone-*` 段。
- 主要根因是工作台使用局部 `.secondary-btn` / `.danger-btn` 类，但 CSS 没有给这些类在工作台范围内提供完整按钮样式，视觉会接近浏览器默认按钮；根容器也有额外内框感。
- live process owner: 主代理负责所有测试和检查；无后台长测试。
- 已将根容器改为透明栈，内部卡片、按钮、字段、成员 chip、drawer close button 与侧栏 surface 对齐。
- 验证通过：`node --test tests/special_zones_workbench_controller_behavior.test.mjs`、`python -m unittest tests.test_ui_rework_plan02_mainline_contract -q`、manifest size/total 校验、`git diff --check`。
- 本机会话未能运行 live browser 截图：Browser 工具没有暴露 localhost inspect 能力，repo 当前也缺少已安装的 `playwright` package。
- 已完成任务留档归档，代码收尾进入提交阶段。
