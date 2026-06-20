# Render Frame Transaction Convergence

## Goal

把 Canvas renderer 的用户可见提交收敛到一条 last-good / visible frame transaction 主路径，并补上 required semantic layer 与 FrameGraphInvalidation / draw subset 的最小合同。

## Constraints

- 保持 Canvas renderer。
- worker bitmap 继续 behind flag。
- `data/locales.json` 是父 checkout 的无关脏文件，本任务不触碰。
- 长测试、Pages dist、dev server、browser smoke 只由主代理拥有；子代理只做静态分析或 review。
- 源 JS 改动要同步 `dist/app`。

## Acceptance

- `CommittedFrameIdentity = { commitKey, metadata }` 在 visible transaction、last-good capture/reuse/reject、first-visible gate 中共用。
- TNO 默认 required semantic layers 覆盖 `scenario_atlantropa` 与 `water`，manifest 可用 `required_semantic_layers` 扩展或覆盖。
- `FrameGraphInvalidation` 描述对象覆盖现有 targetPasses，并显式列出 targetResources 与清理动作。
- `DrawSubsetIndex` 纯 helper 合同覆盖 empty / duplicate / unknown / stale generation。
- 相关 Node/Python/architecture/dist/diff 验证通过或记录明确风险。

## Steps

- [x] 建立隔离 worktree、Ralph 状态、active 任务文档和注册表记录。
- [x] 实现 P0 可见提交权收敛。
- [x] 实现 P0 required semantic resolver / ready gate 合同。
- [x] 实现 P1 FrameGraphInvalidation 纯描述对象。
- [x] 实现 P1 DrawSubsetIndex helper 合同。
- [x] 同步 dist/app。
- [x] 运行 targeted 验证与边界验证。
- [x] 派发 review 自检并修复发现的问题。
- [x] commit、合并 main、推送、归档、清理 worktree。
