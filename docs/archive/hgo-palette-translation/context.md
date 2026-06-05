# Context

本轮 live process owner：主代理。
范围：HGO palette 翻译、相关脚本/测试、dist 发布面。

- 已接入 translate_manager 的 palette geo name 收集。
- 已在 palette_manager 中生成 localizedNameEn/localizedNameZh/localizedName。
- 面板搜索已包含中英文名。
- 已新增 `--palette-locales-only`，用于只同步 palette 名称，避免完整地理库重算。
- 已执行两轮机器翻译和一次人工覆盖同步：最终 `review_queue=0`。
- 已验证 `data/locales.json`、`dist/app/data/locales.json` 以及两个 palette 前端文件哈希一致。
