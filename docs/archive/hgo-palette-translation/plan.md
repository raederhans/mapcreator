# HGO 颜色库翻译

## 目标
- 让 HGO 颜色库中的国家名进入现有翻译脚本输出。
- 主要翻译国名，区域和颜色变体标签沿用已有 UI 翻译。
- 运行翻译脚本后审核数据覆盖、英文回退和发布面同步。

## 验收
- `data/locales.json` 中包含 HGO palette 国家名对应的 `geo` 翻译条目。
- HGO palette 运行时条目可读取中文名字段，英文环境保持原名。
- targeted tests、翻译审计、Pages dist 验证通过。

## 进度
- [x] 定位 palette 与翻译脚本连接点
- [x] 实现 HGO palette 国名翻译收集与运行时消费
- [x] 运行翻译脚本并审核缺口
- [x] 同步 dist/app 并验证

## 结果
- HGO palette 共收集 1310 个国名/文件名候选，已写入 `locales.geo`。
- 机器翻译后剩余 10 个英文回退，已通过 `manual_geo_overrides.json` 人工覆盖。
- 最终 HGO 待审队列为 0，`geo_missing_like=0`，`corrupted_translations=0`。
