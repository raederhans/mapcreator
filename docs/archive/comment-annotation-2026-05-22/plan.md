# 注释添加 2026-05-22 计划

## 目标

按 recent commits + 长文件 + 长期 owner 区域筛选 comment-only 中文注释补强点，优先 startup / appearance / transport workbench 热点。

## 执行步骤

- 读取 automation memory、`lessons learned.md`、近期 churn
- 排除 2026-05-15、2026-05-16、2026-05-19、2026-05-20、2026-05-21 已补过的热点文件
- 选择当前工作树干净、维护价值高的核心 JS 文件
- 仅添加必要中文维护注释
- 运行 `node --check` 与 comment-only diff 检查
- 留档并归档
