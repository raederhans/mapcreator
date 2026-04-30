# 左侧外观面板二次精修计划

目标：修正颜色库箭头对齐、外观各子面板内边距、昼夜面板纵向秩序、上下文图层展开内容左偏空白、海洋面板分组容器。

- [x] 定位当前 DOM 与 CSS 选择器
- [x] 增加外观面板局部 spacing/card 规则
- [x] 重组海洋面板为 2-3 个子容器
- [x] 微调昼夜与上下文图层布局
- [x] 补充 contract/E2E 断言
- [x] 截图验证并归档

验证记录：
- `python -m unittest tests/test_ui_rework_plan02_mainline_contract.py tests/test_ui_rework_plan03_support_transport_contract.py -q` 通过，15 tests。
- `node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_support_transport_hardening.spec.js --reporter=list --workers=1 --retries=0` 通过，12 tests。
- `git diff --check` 通过，仅剩 Windows LF/CRLF 提示。
