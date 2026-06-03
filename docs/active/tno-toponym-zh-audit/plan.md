# TNO 地名汉化审查计划

## 目标

集中审查 `tno_1962` 场景里的地名和城市名中文显示，修正明显机翻、误译和不符合常用中文地名的条目。

## 范围

- `data/scenarios/tno_1962/geo_locale_patch.zh.json`
- `data/scenarios/tno_1962/geo_locale_patch.json`
- `data/scenarios/tno_1962/geo_locale_patch.en.json`
- `data/scenarios/tno_1962/geo_name_overrides.manual.json`
- `data/scenarios/tno_1962/city_overrides.json`
- 相关生成脚本与测试

## 验收标准

- 找出 TNO 地名/城市名里明显错误的中文条目。
- 修正 live 数据源，避免只改生成产物。
- 运行 `python tools/i18n_audit.py`。
- 运行 `python -m unittest tests.test_tno_geo_locale_patch -v`。
- 运行与城市 override 相关的定向测试。

## 任务清单

- [x] 建立候选表，列出英文名、当前中文、来源文件和问题类型。
- [x] 对照 repo 内 TNO/HOI4 资料和常见中文地名，确定第一批高置信修正。
- [x] 修改最小必要数据文件。
- [x] 刷新 TNO geo locale patch。
- [x] 刷新 startup locale/support/bundle 产物。
- [x] 运行定向测试与审计。
- [x] 第二轮专项：非洲和印度明显错译候选提取。
- [x] 第二轮专项：修改 canonical 源表并刷新产物。
- [x] 第二轮专项：验证与复核。
- [x] 最终复核是否有更简单稳健的实现方式。

## 第二轮验证记录

- `python tools\i18n_audit.py`
- `python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`
- `git diff --check`

## 第三轮：中国境内地名

- [x] 抽取 `CN_*` 中国境内地名候选。
- [x] 联网对照 NBS/ChinaFile、GB/T 2260、县级以上行政区划历史数据。
- [x] 只修唯一匹配的高置信 `xian` 后缀错译和同音错字。
- [x] 刷新 TNO geo locale patch。
- [x] 刷新 startup locale/support/bundle 产物。
- [x] 运行残留扫描、审计和定向测试。
- [x] 提交并推送第三轮专项修正。

## 第三轮验证记录

- 残留扫描：339 个预期修正全部进入 `geo_locale_patch`，实际 diff 为 677 个 locale `zh` 值变化，剩余 22 个同音/拼写变体候选保留人工判读。
- `python tools\i18n_audit.py`
- `python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`
- `git diff --check`
