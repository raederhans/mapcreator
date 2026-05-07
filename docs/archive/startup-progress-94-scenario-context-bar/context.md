# context

2026-05-05：用户提供控制台显示 `toolbar.js:1428 ReferenceError: scenarioViewLabel is not defined`，启动 bundle apply 失败后 fallback 也失败，deferred UI bootstrap 继续抛同一错误。初步判断卡在 94 的主因是 toolbar refresh 中使用了未声明变量，导致 scenario apply rollback 和 UI replay 无法完成。

2026-05-05：根因已确认：最近 diff 删除了 `refreshScenarioContextBar()` 内部的 `splitCount` 和 `scenarioViewLabel` 局部变量，但函数后半段仍把它们传给 `renderScenarioGuideStatus()`。JS 在 scenario apply / rollback / deferred UI bootstrap 触发 context bar refresh 时抛 ReferenceError，阻断启动状态推进。修复方式：恢复两个局部变量，保留当前 mode title 的简化显示，并用静态 contract 测试锁住 guide status 入参。

2026-05-05：首次复跑启动 smoke 后，`scenarioViewLabel` fatal 消失，但下一处同类删除残留暴露：`sidebar.js:createCountryInspectorState()` 使用 `controllerFeatureCount`，该变量当前未声明。说明卡 94 的根因类别是 UI label/state 拆分时删除了仍被 facade 传递的局部派生字段；继续按同类根因收口。

2026-05-05：第二个 fatal 已修复：恢复 `controllerFeatureCount` 局部字段，只把 `featureCount` 的显示口径保持为 owner count，避免影响当前未提交改动对 controller-only 计数口径的主动调整。补 `test_sidebar_split_boundary_contract` 静态合同，确保 `featureCount / ownerFeatureCount / controllerFeatureCount` 三个返回字段都有对应局部来源。

2026-05-05：复验结果：quick smoke 通过并越过 94；console route 显示 0 errors / 3 warnings，warnings 为 D3 unsafe water geometry 和 startup bundle preload 未消费。network route 的采集命令仍调用旧 `network` 子命令，当前 Playwright CLI 实际命令是 `requests`，所以脚本报告里的 network summary 可信度有限，但 dev server 日志未见 4xx。轻量 perf：TNO 2 runs + 1 warmup 平均 totalStartupMs 7644.65ms，旧 baseline 5805.30ms；这不是卡 94 的原因，但有性能疑点，应作为独立性能任务继续查 `applyScenarioBundleMs` 增长。

2026-05-05：顺手修复启动检视脚本自身的网络采集面：当前 Playwright CLI 已使用 `requests`，旧 `network` 子命令只会输出 help 并污染 stderr。脚本已改为 `requests`，并让 network issue parser 在没有 pointer source 时直接解析命令输出文件。

2026-05-05：最终 quick smoke（20260505-144515）通过，stderr 为空。console 0 errors / 3 warnings；network requests 正常输出，未匹配 4xx/5xx。脚本 CLI calls 从旧 network 子命令污染时的 18 降为 17，CLI time 31697ms。

2026-05-05：任务收口状态：启动 fatal 已修复；启动脚本网络采集已修复；性能已完成轻量测算并暴露 follow-up。性能深挖范围会碰 apply pipeline / scenario bundle timing，建议作为独立任务处理。
