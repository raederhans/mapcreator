# appearance-transport-visual-audit context

- 任务开始：2026-05-01
- 目标：只读审查 app 外观算法，覆盖 appearance / ocean / transport / Japan 面板，输出发现与修改方案。
- 约束：主线程独占 live browser / live test；子代理只做静态分析；优先 live code 与当前 UI。
- 已完成：读取 lessons learned、agent tiers、相关 memory；建立任务目录；并行完成 panel/file 映射、code review、architecture review。
- 浏览器结果：TNO 默认启动直接出现 detail visibility gate，控制台同时报 physical atlas / contours unavailable。已产出截图与 JSON 报告：
  - .runtime/reports/generated/browser/appearance-audit.json
  - .runtime/browser/mcp-artifacts/appearance-audit/
  - .runtime/browser/mcp-artifacts/appearance-audit-clean/
- 关键发现：
  1. Transport Overview 视觉失衡：airport/port 在世界视图下噪声极大，road/rail 几乎无感。
  2. Workbench 存在文案与真实状态冲突：layers 面板仍写“Only the road family is live right now”，但实际 8 个 family 都是 live preview。
  3. Workbench 与主地图 transport 是两套状态真相源：`styleConfig.transportOverview` vs `transportWorkbenchUi.*`，Apply to Main Map 长期 disabled。
  4. Workbench preview 缺少异步过期请求保护，旧渲染可能覆盖新渲染。
  5. Airport/Port 子开关和 transport master toggle 同步不完整。
  6. Label separation UI 上限 1.8，但 normalize clamp 到 1。
  7. Ocean bathymetry 在默认世界视图存在感弱；Texture paper 会明显压灰整张图；Day/Night 遮罩感太重。
