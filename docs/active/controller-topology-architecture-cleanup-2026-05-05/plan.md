# 三项架构清理后续推进 - 执行计划与进度

## 验收目标
- HOI4/TNO rebuild 产出 owner-only scenario bundle。
- controllers.by_feature.json 退出正式 checkpoint / publish / checker contract。
- topology candidate audit 能证明参数、transform、fallback 状态和体积变化。
- Phase 3b 参数推广只在 gate、checker、视觉关键点通过后发生。

## 阶段计划
1. controller build-chain owner-only 收口。
2. HOI4 checker / expectation controller 语义收口。
3. topology candidate audit v2 fail-closed gate。
4. Phase 3b 只补可验证候选流程入口，不直接更新 production 参数。
5. 串行 targeted verification + review。

## 进度
- [x] 2026-05-05 建立 fresh-context Ralph snapshot 和 active docs。
- [x] controller 影响面静态映射。
- [x] controller 收口实现。
- [x] topology audit gate 实现。
- [x] tests / expectations 更新。
- [x] 主线程验证与自检。
