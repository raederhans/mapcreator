# 左侧剧本与外观面板字体/空间精修计划

目标：统一左侧剧本、外观海洋/边界/纹理、特殊区域编辑器、颜色库的内部字体层级；删除用户指定的冗余文本和帮助控件；把释放出来的空间交还给主体内容。

- [x] 定位 DOM/CSS/JS owner 和现有测试
- [x] 建立左侧面板局部字体 token 与层级规则
- [x] 删除剧本展开后的剧本名字与前线计数文本
- [x] 删除外观-上下文图层搜索栏
- [x] 删除外观-纹理面板的纹理覆盖标题、帮助按钮和说明文本
- [x] 补充/扩展 targeted 测试
- [x] 运行静态合同、targeted E2E 与浏览器截图审计

验证记录：
- `python -m unittest tests/test_ui_rework_plan02_mainline_contract.py tests/test_ui_rework_plan03_support_transport_contract.py -q` 通过，15 tests。
- `node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_support_transport_hardening.spec.js --reporter=list --workers=1 --retries=0` 通过，12 tests。
- 截图与视觉指标写入 `.runtime/browser/mcp-artifacts/left-sidebar-appearance-typography/`。
