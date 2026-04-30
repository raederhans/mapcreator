# 左侧上下文图层与 Transport 精修实施规格

## 问题
城市点位说明过多、河流虚线选择可能未进入渲染链、Transport 四个家族面板层级松散。

## 边界
只改左侧 Appearance 面板内的 City Points、Rivers、Transport 子面板；保留现有控件 id 和 JS 绑定；测试扩展现有 plan03 support/e2e 与 owner contract。

## 顺序
1. 精简 City Points 文案，把说明移入 help tooltip，拆成 Style 与 Labels 两个子容器。
2. 修 Rivers dashStyle 绑定/渲染链，拆成 River Stroke 与 Outline & Dash 两个子容器。
3. 给 Transport 四类 family 和内部 Visibility/Labels/Scope 增加一致卡片样式。
4. 用静态合同、E2E 交互和截图验证布局与功能。

## 接口
DOM id 保持不变：`cityPointsTheme`、`cityPointsMarkerDensity`、`cityPointsLabelDensity`、`riversDashStyle`、`toggleAirports`/`togglePorts`/`toggleRail`/`toggleRoad` 等继续由现有 controller 读取。删除的帮助段落保留 JS 可空绑定，避免 UI render 抛错。

## 完成信号
指定帮助说明收口；Rivers dash change 后 runtime state 和渲染配置同步；Transport 4 个 family 都有外层卡片与内部子容器；targeted tests 通过；截图写入 `.runtime/browser/mcp-artifacts/left-sidebar-context-transport-polish/`。

## 验证记录
- `python -m unittest tests/test_toolbar_split_boundary_contract.py tests/test_ui_rework_plan02_mainline_contract.py tests/test_ui_rework_plan03_support_transport_contract.py -q` 通过，46 tests。
- `node node_modules/@playwright/test/cli.js test tests/e2e/ui_rework_support_transport_hardening.spec.js --reporter=list --workers=1 --retries=0` 通过，12 tests。
- `git diff --check` 通过，仅有 Windows LF/CRLF 提示。
