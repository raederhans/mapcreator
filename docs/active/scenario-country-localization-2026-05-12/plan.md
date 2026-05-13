# Scenario country localization 2026-05-12

目标：仅修改 tno_1962 中指定国家的中文本地化显示名，保持国家 tag、owner、颜色、几何、chunk、runtime 逻辑不变；修正俄国 `Rayon` 地名中文后缀误译。

边界：
- 允许修改 scenario-scoped 本地化/显示数据文件、全局地名源表中的明确误译项，以及 contract 派生记录。
- 不修改 JS/Python 运行逻辑。
- `Rayon` 修正处理英文 key 以 `Rayon` 结尾的俄国区级地名，中文统一以 `区` 收尾。
- 不启动浏览器 smoke；本任务可用数据检查和 contract 验证覆盖。
- 主线程独占所有测试/验证命令；子代理只做只读定位和复核。

验收：
- [x] 第一批 19 个目标国家中文显示名全部为用户指定值。
- [x] 第二批 21 个目标国家中文显示名全部为用户指定值。
- [x] 第三批 18 个目标国家中文显示名全部为用户指定值。
- [x] `data/locales.json`、`data/i18n/locales_baseline.json`、`data/scenarios/tno_1962/locales.startup.json` 中 `Rayon` 与 `Rayon (...)` 中文条目 `人造丝` 清零，且中文名全部以 `区` 收尾。
- [x] `geo_locale_patch*` 派生产物刷新完成。
- [x] `startup.bundle.en/zh.json(.gz)` 同步完成。
- [x] `python tools/i18n_audit.py` 通过。
- [x] `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962` 通过。
- [x] `git diff --check -- <本轮相关文件>` 通过。

任务清单：
- [x] 定位当前本地化来源与运行时消费路径。
- [x] 最小修改 tno_1962 国家中文显示名。
- [x] 修正 `Rayon` 地名源表误译。
- [x] 刷新 geo-locale、startup support、startup bundle、snapshot/audit 派生产物。
- [x] 运行 targeted 验证。
- [x] 做收尾自检并记录进度。

