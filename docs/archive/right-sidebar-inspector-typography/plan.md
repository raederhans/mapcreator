# 右侧检查器字体与特殊区域可见性计划

目标：按“领土与预设”的层级感统一国家检查器、水域地块、特殊区域三个面板内部字体，并修复特殊区域面板在有活动场景时因内容加载时序被隐藏的问题。

- [x] 核对现有 CSS 字体 token 与面板内部选择器
- [x] 用领土与预设的字体层级约束国家/水域/特殊区域内部控件
- [x] 调整特殊区域空内容状态，让活动场景下主面板保持可见
- [x] 补充静态合同与 E2E 断言
- [x] 运行 targeted 验证并记录结果

验证记录：
- `python -m unittest tests/test_ui_rework_plan01_foundation_contract.py tests/test_ui_rework_plan02_mainline_contract.py tests/test_ui_rework_plan03_support_transport_contract.py tests/test_water_special_region_sidebar_boundary_contract.py -q` 通过，26 tests。
- `node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_mainline_shell_sidebar.spec.js --grep "country inspector submenus" --reporter=list --workers=1 --retries=0` 通过。
- `node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_support_transport_hardening.spec.js --grep "project support panels and inspector search" --reporter=list --workers=1 --retries=0` 通过。
- `git diff --check -- css/style.css js/ui/sidebar/water_special_region_controller.js tests/e2e/ui_rework_mainline_shell_sidebar.spec.js tests/test_ui_rework_plan02_mainline_contract.py docs/active/right-sidebar-inspector-typography` 通过，仅提示 Windows CRLF 常规换行告警。
- 浏览器字体审计输出：`.runtime/browser/mcp-artifacts/inspector-typography-audit/font-audit-after.json`。
- 截图：`.runtime/browser/mcp-artifacts/inspector-typography-audit/inspector-typography-after.png`、`.runtime/browser/mcp-artifacts/inspector-typography-audit/special-region-toggle-off-visible.png`。
- `tests/e2e/sidebar_default_collapse.spec.js` 在 palette toggle 等待处超时，未进入特殊区域检查路径；失败截图在 `.runtime/tests/playwright/sidebar_default_collapse-d-43f74-apsed-until-explicitly-used/test-failed-1.png`。
