# Context

2026-05-12：用户要求修改多批剧本内国家中文名，并强调只影响本地化呈现与项目稳定性。

第一批执行结论：目标国家集中在 `data/scenarios/tno_1962/countries.json` 的 `countries.<TAG>` 记录。已为第一批 19 个 tag 补充 `display_name_en` 与 `display_name_zh`，保留原 `display_name`、tag、颜色、owner、feature_count、规则来源等逻辑字段。

第二批执行结论：继续为 21 个 tag 补充 `display_name_en` 与 `display_name_zh`；修正 `data/locales.json` 与 `data/i18n/locales_baseline.json` 中基础 `Rayon` 条目。

第三批执行结论：继续为 18 个 tag 补充 `display_name_en` 与 `display_name_zh`。新疆使用 `XIN`；`SIK` 保持 controller overlay 语义。复核发现带地区后缀的 `Rayon (RU)` 条目仍有旧译，已同步修正到 source 与 startup 派生产物。未修改 JS/Python 运行逻辑。

刷新链：
- `python tools/build_tno_1962_geo_locale_patch.py --scenario-dir data/scenarios/tno_1962 --output data/scenarios/tno_1962/geo_locale_patch.json`
- `python tools/build_startup_bootstrap_assets.py`（刷新 `locales.startup.json` 与 `runtime_topology.bootstrap.topo.json`）
- `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962`

已验证：
- 58 个 `display_name_zh` 在 `countries.json`、`startup.bundle.en/zh.json` 和 `.gz` 中全部匹配；第三批单独验证 18 个目标全部匹配。
- `Rayon` 误译 `人造丝` 在 source、startup 与 geo patch 派生产物中清零；`data/locales.json` 与 `data/i18n/locales_baseline.json` 各 212 个 `Rayon` 中文条目、`locales.startup.json` 108 个启动期 `Rayon` 中文条目全部以 `区` 收尾。
- `python tools/i18n_audit.py` 通过。
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962` 通过。
- `git diff --check -- <本轮相关文件>` 通过，只有 Windows LF/CRLF 提示。

live process owner：主线程拥有所有验证命令。子代理 019e1dea-6e09-7fd1-8dc0-584598766b84、019e1dfc-41fc-7b31-86db-a446397835ee、019e1e62-7d8d-7ba2-8b5a-8f1c6ac4aa51、019e1e66-dfb1-7e30-be4d-d59aa539f555 做只读定位或复核。

