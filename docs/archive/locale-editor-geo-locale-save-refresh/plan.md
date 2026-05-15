# Locale editor geo locale save refresh

## 目标
保存 geo locale patch 后，前端重新加载保存端实际写入的文件，保证 runtime、编辑面板和 tooltip 看到同一份最新数据。

## 约束
- 只改 review 指到的 locale editor 保存刷新链路和对应 contract。
- 当前仓库有大量无关 WIP，提交时只 stage 本任务文件。
- 主线程独占所有测试；子代理/审查只做静态分析。

## 验收
- 前端优先读取保存响应中的实际 generated/published 路径。
- 当前语言 descriptor 仍只负责确定编辑目标。
- 分语言 manifest 下保存 en、UI zh 的场景有 contract 覆盖。
- node --check 和 targeted unittest 通过。

## 进度
- [x] 定位保存响应字段和前端刷新点。
- [x] 修复刷新路径选择。
- [x] 补充/扩展 contract。
- [x] 验证、review 自检、归档并提交。
