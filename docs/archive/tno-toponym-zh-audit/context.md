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

## 2026-06-03 第三轮专项

- 新目标：专项审查中国境内 TNO 地名里的奇怪音译错误和同音错字。
- 外部对照：ChinaFile/NBS 官方地名 CSV 说明、GB/T 2260 文档、`yescallop/areacodes` 县级以上行政区划历史数据。
- 本轮只写回唯一匹配的高置信项：`CN_*` 且英文名以 `xian` 结尾、当前中文未以 `县` 结尾，并且行政区划拼音索引只对应一个县级中文名。
- 已生成 runtime 复核文件：`.runtime/tmp/china-toponyms/china-xian-updates.json`、`.runtime/tmp/china-toponyms/china-locales-applied.json`。
- 已写回 `data/locales.json`：271 个 feature 修正，覆盖 542 个 locale 键。
- 示例：`Xintianxian -> 新田县`、`Antuxian -> 安图县`、`Dahuayaozuzizhixian -> 大化瑶族自治县`、`Longlingezuzizhixian -> 隆林各族自治县`、`Ledonglizuzizhixian -> 乐东黎族自治县`。
- 已追加人工高置信修正：66 个 feature 拼写变体，覆盖 131 个 locale 键；另修 `Huizhexian -> 会泽县`、`Linyi -> 临沂`。
- 追加示例：`Luohuoxian -> 炉霍县`、`Celexian -> 策勒县`、`Panxiantequ -> 盘县特区`、`Jinpingmiaozhuyaozhudaizuzizhixian -> 金平苗族瑶族傣族自治县`、`Qinglongxian -> 晴隆县`。
- 已运行 `python tools\build_tno_1962_geo_locale_patch.py`，结果仍为 11022 条 feature locales，0 个 cross-base collision。
- 已运行 `python tools\build_startup_bootstrap_assets.py --report-path .runtime\reports\generated\tno-startup-support-toponym-china-zh.json`，`startup_geo_entry_count=44541`，`startup_alias_count=222`。
- 已运行 `python tools\build_startup_bundle.py ... --report-path .runtime\reports\generated\tno-startup-bundle-toponym-china-zh.json`，en/zh gzip 均为 1378919 bytes，未超 5000000 bytes 预算。
- 残留扫描：339 个预期修正全部进入 `geo_locale_patch`；实际 diff 为 677 个 locale `zh` 值变化；剩余 22 个候选多为 `Xixian/Gongyanxian` 这类同音、多省重名或 TNO 拼写变体，保留给下一轮人工定位。
- 已新增 `tests.test_tno_geo_locale_patch.TnoGeoLocalePatchTest.test_checked_in_tno_china_toponym_fixes_stay_synced`，锁住主源、TNO patch、中文 patch、startup locale 的关键样例同步。
- 验证通过：`python tools\i18n_audit.py`，关键结果 `scenario_geo_missing=0`、`corrupted_translations=0`。
- 验证通过：`python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`，11 个测试通过。
- 验证通过：`git diff --check`。输出仅有 Git 行尾转换提示。

## 2026-06-03 第四轮专项

- 新目标：专项审查法国与德国地名；德国部分优先核对战前/战时旧德名。
- 候选范围：`FR_*` 313 条；owner/core 涉及 `FRA`、`GER`、`BRG` 的 TNO 地名共 1175 条。
- 外部对照：东普鲁士/柯尼斯堡旧名、波兰境内旧德名、阿尔萨斯历史德语地名。
- 初步原则：法国只修明显词义机翻；德国只修已有 TNO 德国控制区内可证的旧德名或明显机翻，不强行重命名所有行政县。
- 已写回 `data/locales.json`：155 个 locale 键，覆盖法国明显词义机翻、波兰旧德名、东普鲁士旧名和俄文 raw name 精确上下文项。
- 法国示例：`Gap -> 加普`、`Nice -> 尼斯`、`Condom -> 孔东`、`Tours -> 图尔`、`Provins -> 普罗万`。
- 德国旧名示例：`Gorzów Wielkopolski -> 瓦尔特河畔兰茨贝格`、`Słupsk -> 施托尔普`、`Gusevsky District -> 贡宾嫩`、`Chernyakhovsky District -> 因斯特堡`、`Советский городской округ -> 蒂尔西特`。
- 已运行 `python tools\build_tno_1962_geo_locale_patch.py`，结果仍为 11022 条 feature locales，0 个 cross-base collision。
- 已恢复 `geo_locale_patch*.json` checked-in 结构，仅同步生成后的 `geo` 值，英文 patch 保持原状。
- 已运行 `python tools\build_startup_bootstrap_assets.py --report-path .runtime\reports\generated\tno-startup-support-toponym-fr-de-zh.json`，`startup_geo_entry_count=44541`，`startup_alias_count=222`。
- 已运行 `python tools\build_startup_bundle.py ... --report-path .runtime\reports\generated\tno-startup-bundle-toponym-fr-de-zh.json`，en/zh gzip 均为 1374201 bytes，未超 5000000 bytes 预算。
- 残留扫描：法国/德国目标范围坏词命中为 0。
- 已新增 `tests.test_tno_geo_locale_patch.TnoGeoLocalePatchTest.test_checked_in_tno_france_germany_toponym_fixes_stay_synced`，锁住法国机翻和德国旧名关键样例同步。
- 验证通过：`python tools\i18n_audit.py`，关键结果 `scenario_geo_missing=0`、`corrupted_translations=0`。
- 验证通过：`python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`，12 个测试通过。
- 验证通过：`git diff --check`。输出仅有 Git 行尾转换提示。

## 2026-06-03 第五轮专项

- 新目标：审查欧洲其余未专项扫描国家，排除荷兰、俄罗斯、法国、德国、中国、印度和南亚专项范围。
- 子代理只读审查补充了阿塞拜疆、保加利亚、摩尔多瓦、罗马尼亚、土耳其等明显词义机翻候选；主线程负责源表修改和所有生成/测试。
- 外部对照：斯洛伐克 79 个 district 列表、波兰 Łask/Turek/Strzelce 县页、乌克兰 Turka/Varva/Liubeshiv 地名页、阿塞拜疆行政区列表、保加利亚省份列表、摩尔多瓦 Toponymic Factfile、土耳其省份列表。
- 已写回 `data/locales.json`：221 个 locale `zh` 值，覆盖全局键、国家后缀键、上下文键和 `id::` 精确键。
- 示例：`Masallı -> 马萨雷`、`Tovuz -> 托武兹`、`Видин -> 维丁`、`Ungheni -> 温盖尼`、`łaski -> 瓦斯克`、`Vaslui -> 瓦斯卢伊`、`Bursa -> 布尔萨`、`Turka -> 图尔卡`。
- 斯洛伐克乱码示例：`District of Bansks Bystrica -> 班斯卡-比斯特里察`、`District of Nova Mesto nad Va* -> 瓦赫河畔新梅斯托`、`District of Partizonske -> 帕尔蒂赞斯凯`。
- 已运行 `python tools\build_tno_1962_geo_locale_patch.py`，结果仍为 11022 条 feature locales，0 个 cross-base collision。
- 已恢复 `geo_locale_patch*.json` checked-in 结构，仅同步生成后的 `geo` 值，英文 patch 保持原状。
- 已运行 `python tools\build_startup_bootstrap_assets.py --report-path .runtime\reports\generated\tno-startup-support-toponym-europe-rest-zh.json`，`startup_geo_entry_count=44541`，`startup_alias_count=222`。
- 已运行 `python tools\build_startup_bundle.py ... --report-path .runtime\reports\generated\tno-startup-bundle-toponym-europe-rest-zh.json`，en/zh gzip 均为 1374201 bytes，未超 5000000 bytes 预算。
- 残留扫描：欧洲其余国家目标坏词命中为 0。
- 已新增 `tests.test_tno_geo_locale_patch.TnoGeoLocalePatchTest.test_checked_in_tno_rest_of_europe_toponym_fixes_stay_synced`，锁住关键样例同步。
- 验证通过：`python tools\i18n_audit.py`，关键结果 `scenario_geo_missing=0`、`corrupted_translations=0`。
- 验证通过：`python -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`，13 个测试通过。
- 验证通过：`git diff --check`。输出仅有 Git 行尾转换提示。
- 第一性原理复核：本轮继续采用源表到生成产物的单向同步；普通行政后缀风格项暂不纳入，避免把低风险样式清理混进明显错译修正。
