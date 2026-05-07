# TNO Atlantropa startup meta review fix

目标：修复 review 指出的两个真实 contract 缺口。

- startup bootstrap 只有 political shell 时，runtime meta 保留 bundle/worker seed 中 political + Atlantropa 的完整 featureIds。
- extract_scenario_atlantropa.py 迁移 political 几何后，同步重建 political.computed_neighbors，避免 index 错位。
- 验证以 targeted node/python tests、strict scenario contract、git diff check 为准。

执行结果：两个 blocker 已修复并通过 targeted verification。当前任务只覆盖 review blocker，未收口工作区已有的其他 TNO/data/UI 改动。
