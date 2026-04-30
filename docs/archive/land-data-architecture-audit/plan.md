# 地块数据架构审计计划

## 目标
审计 mapcreator 的地块数据来源、拼接方式、精度漂移、废弃/损坏数据、兜底机制负担，输出证据化问题清单。

## 范围
- data/ 下的 topology、scenario、transport、palette、generated/static 数据。
- map_builder、tools、js/core 中的加载、生成、发布、fallback、chunk/runtime 链路。
- 只读审计，不改业务代码。

## 验收标准
- 每个发现包含文件路径或命令证据。
- 区分已证实事实、强风险、需要进一步验证的线索。
- 标出废弃/疑似损坏/非必要负担数据。
- 标出会导致维护漂移的兜底或多源真相源。
