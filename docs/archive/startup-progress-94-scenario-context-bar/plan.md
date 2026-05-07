# startup-progress-94-scenario-context-bar plan

## 目标
修复默认启动脚本卡在进度 94 的直接 runtime error，并确认这次问题来自脚本应用异常还是加载性能退化。

## 验收
- `scenarioViewLabel is not defined` 在静态检查和启动脚本输出中消失。
- 相关 toolbar context bar 调用在启动、rollback、deferred UI bootstrap 三条路径都能拿到同一组 label。
- 启动脚本能越过 94，输出可读的 console/network/perf 证据。
- 改动只碰根因相关文件，避免扩大到未提交大改的其他面。

## 执行清单
- [x] 定位 `scenarioViewLabel` 的真实来源和最近改动差异。
- [x] 加最小回归测试或扩展现有测试，锁住 context bar label 变量。
- [x] 修复 `toolbar.js` 和必要的 `dist/app` 镜像。
- [x] 跑 targeted 测试。
- [x] 用启动脚本复验，并读取性能/console/network 证据。
- [x] 做最终自检与 lessons learned 检查。
