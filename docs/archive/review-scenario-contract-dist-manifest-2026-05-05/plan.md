# Review follow-up: scenario contract + Pages dist manifest

## 目标
修复 review blocker：blank_base / modern_world strict scenario contract snapshot 失配，以及 dist/pages-dist-manifest.json 引用已删除发布文件。

## 验收
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/blank_base` 通过。
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/modern_world` 通过。
- `dist/pages-dist-manifest.json` 不再列出不存在的 `controllers.by_feature.json` 与 `app/js/core/scenario_owner_metrics.js`。
- Pages dist 生成链可以刷新 manifest，若暴露其他 stale startup URL，同步用正式生成路径收口。

## 进度
- 已读取 review，先核实再修。
- 初次运行 `python tools/build_pages_dist.py --help` 触发真实 build，暴露 hoi4/tno startup bundle 仍引用 controllers_url，说明发布链 stale 面大于 review 的两个文件。
