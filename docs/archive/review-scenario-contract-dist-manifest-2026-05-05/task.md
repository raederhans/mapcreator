# Task checklist

- [x] 复现 strict scenario contract 失败
- [x] 找到 snapshot / dist manifest 正式刷新路径
- [x] 最小刷新 checked-in scenario snapshots
- [x] 最小刷新 pages dist manifest
- [x] targeted verification
- [x] 自检 diff

## 验证记录
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/blank_base` OK
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/modern_world` OK
- `python tools/build_pages_dist.py` OK，刷新 `dist/pages-dist-manifest.json`
- `python -m unittest tests.test_pages_dist_startup_shell -q` OK，13 tests
- manifest walk probe：`blocked_hits=[]`，`missing_count=0`
