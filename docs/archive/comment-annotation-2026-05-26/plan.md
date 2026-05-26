# 注释添加 2026-05-26 计划

## 目标

按 recent commits + 长文件 + 长期 owner 区域筛选新的 comment-only 中文注释补强点，提升 scenario apply、frame scheduling、history、special zone layer 相关核心文件的可维护性。

## 执行步骤

- 读取 automation memory、`lessons learned.md`、近期 churn 和已有归档
- 排除 2026-05-15 到 2026-05-25 已补过的热点文件
- 避开当前工作树已经脏掉的文件，只选干净且高价值的核心 JS 文件
- 为目标文件补充必要中文维护注释
- 运行 `node --check`、`git diff --ignore-space-at-eol`、`git diff --check`
- 更新 automation memory，并在完成后归档当前任务目录
