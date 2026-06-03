# TNO 地名汉化审查上下文

## 2026-06-03

- 工作树：`C:/Users/raede/Desktop/dev/mapcreator-tno-toponym-zh-audit`
- 分支：`codex/tno-toponym-zh-audit`
- 基线：`origin/main`，提交 `c91f18cf`
- 主 checkout 有未提交改动，本任务使用独立 worktree，避免覆盖现有工作。
- live process owner：主线程。子代理只做静态分析，不运行测试、构建、dev server 或浏览器。
- 已加载规则：`ultrawork`、`scenario-toponym-suggester`、memory 里的 `mapcreator-localization-audit-sync`。
- 初始入口：TNO geo locale、manual geo overrides、city overrides、startup bundle、相关 builder 和 unittest。

## 发现

- `data/locales.json` 的 `geo` 段是 TNO geo locale patch 的主要中文来源；只改 `geo_locale_patch*.json` 会在后续 builder 运行时回退。
- 第一批高置信错误包括通用机翻词义错误，如 `Encamp`、`Hamadan`、`Imereti`、`Santander`、加拿大选区里的 `St.` 和 `Hope/Mission` 等。
- 荷兰重点噪声是 NL 分区里的行政尾巴和直译，如 `北荷兰省负责人`、`北德伦特省`、`西北布拉班特省`。
- 俄罗斯重点噪声是 `Rayon -> 人造丝`、真实地名尾部 `(RU)/（俄罗斯）`、`Urban District -> 市区`。
- `Russia Shell Fallback ... (RU)` 是内部占位式名称；曾被过宽规则命中，已恢复，避免把内部 fallback 名称改成更模糊的展示名。

## 执行记录

- 已建立任务留档。
- 已完成源表修正，并运行 `python tools\build_tno_1962_geo_locale_patch.py` 重建 TNO geo locale patch。
- 已运行 `python tools\build_startup_bootstrap_assets.py --report-path .runtime\reports\generated\tno-startup-support-toponym-zh.json`，启动地名条目数为 44541。
- 已运行 `python tools\build_startup_bundle.py ... --report-path .runtime\reports\generated\tno-startup-bundle-toponym-zh.json`，zh/en gzip 均为 1378919 bytes，未超 5000000 bytes 预算。
- 已将 `geo_locale_patch*.json` 从 builder 的单行/重排形态压回 checked-in 结构，只保留实际 `geo` 值变化。
- 验证通过：
  - `python tools\i18n_audit.py`
  - `python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`
  - `git diff --check`
  - TNO patch 残留扫描：`人造丝`、俄罗斯尾缀、荷兰 `省/负责人/专员辖区/集团` 目标噪声均为 0。
- 额外运行 `python -m unittest tests.test_startup_bootstrap_assets -v` 时有 2 个既有 shell object 列表断言失败，失败点是 `scenario_atlantropa` 多于测试期望；本轮未修改相关 runtime shell 代码或 topology 文件。

## 2026-06-03 第二轮专项

- 新目标：专项审查非洲与印度/南亚 TNO 地名中的明显错误中文。
- 执行策略：只修高置信机翻或错译；不对不确定音译做大规模标准化。
- live process owner：主线程。子代理仅做静态候选审查，不运行构建或测试。
- 已修正非洲明显错译，包括 `Mascara -> 马斯卡拉`、`M'Sila -> 姆西拉`、`As Suways -> 苏伊士`、`Al Wadi at Jadid -> 新河谷`、`Kasaï-Occidental -> 卡萨伊西部`、`Surt -> 苏尔特`、`Kaffrine -> 卡夫林`、`Cuvette -> 盆地省`。
- 已修正印度/南亚明显错译，包括 `Morbi -> 莫尔比`、`Erode -> 埃罗德`、`Vadodara -> 瓦多达拉`、`Ujjain -> 乌贾因`、`Karnali -> 卡纳利`、`Sind -> 信德`、`Kægalla -> 卡加拉`。
- 残留坏词扫描结果：目标坏词只剩 `Saint-Denis -> 圣但尼`、`gdański -> 格但斯克`、`Gdańsk -> 但泽` 三个误报。
- 附带修正两个扫描出的高置信错译：`Qazvin -> 加兹温`、`Mono County -> 莫诺县`。
- 已运行 `python tools\build_tno_1962_geo_locale_patch.py`，结果仍为 11022 条 feature locales，0 个 cross-base collision。
- 已恢复 `geo_locale_patch*.json` 的 checked-in 结构，仅同步生成后的 `geo` 值。
- 已运行 `python tools\build_startup_bootstrap_assets.py --report-path .runtime\reports\generated\tno-startup-support-toponym-africa-india-zh.json`，`startup_geo_entry_count=44541`，`startup_alias_count=222`。
- 已运行 `python tools\build_startup_bundle.py ... --report-path .runtime\reports\generated\tno-startup-bundle-toponym-africa-india-zh.json`，en/zh gzip 均为 1378919 bytes，未超 5000000 bytes 预算。
- 验证通过：`python tools\i18n_audit.py`，关键结果 `scenario_geo_missing=0`、`corrupted_translations=0`。
- 验证通过：`python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`，10 个测试通过。
- 验证通过：`git diff --check`。输出仅有 Git 行尾转换提示。
- 第一性原理复核：本轮继续改 canonical 源表 `data/locales.json`，再通过现有 builder 同步交付产物；这是当前最短且稳健的路径。直接改 patch 或 bundle 会在后续生成时丢失。
