# perf-benchmark-review-fix plan

目标：修复 editor performance benchmark 的两个 review 点，保持 diff 小且可回归验证。

验收：
- 无 long task 的 repeatedZoomRegions cycle 不会因为空 topSubOwner 记为 unknownTopSubOwnerCount。
- benchmark restore/unknown subowner evidence 的 metricRecordedAt 与 taskWindowMs 使用同一 epoch 毫秒时间轴。
- 扩展现有 tests/test_perf_gate_contract.py，不新建孤儿测试。
- python -m unittest tests/test_perf_gate_contract.py -q 通过。
- git diff --check 通过。
