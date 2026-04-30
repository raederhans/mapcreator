# perf-benchmark-review-fix context

2026-04-30 开始：review 指出 repeatedZoomRegions 无 long task cycle 也会被 topSubOwner gate 判失败；另一个问题是 subowner evidence 的 metricRecordedAt 混用 performance.now() 与 epoch ms。

进展：
- 已定位三处 Python 聚合 topSubOwner gate：全局 cycle、region entry、region fallback cycle。
- 已新增 has_reportable_long_task_attribution()，只有 attribution 内存在超过 750ms 的任务或对应计数时才检查 topSubOwner。
- 已新增 JS sampleEpochMs()，将 sampleContext.sampledAt 转为 timeOrigin + sampledAt 后写入 subowner evidence。
- 已扩展 tests/test_perf_gate_contract.py：静态锁定 sampleEpochMs，并新增无 long task 通过 gate 的回归样例。

验证：
- python -m py_compile ops/browser-mcp/editor-performance-benchmark.py 通过。
- python -m unittest tests/test_perf_gate_contract.py -q：14 tests OK。
- git diff --check -- ops/browser-mcp/editor-performance-benchmark.py tests/test_perf_gate_contract.py docs/active/perf-benchmark-review-fix 通过。

自检：
- 更简单稳健方案：直接把 gate 条件绑定到 has_reportable_long_task_attribution，比在 gate 末端特判 taskCount 更贴近根因；taskCount 和 topSubOwner 均来自同一个 attribution 语义。
- 时间轴修复集中为 sampleEpochMs，三个 sampleContext evidence 分支复用同一逻辑，避免后续某个 unknown/browser 分支继续混用 performance.now()。
- lessons learned 已检查，本次属于局部 review follow-up，没有新增可复用重大教训。
