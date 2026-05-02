# Maintainability / Stability Roadmap Execution Plan

## Goal
按 2026-05-02 最新后续计划，把 maintainability / stability 路线重新拉回 active，并持续做到真实剩余项完成。

## Constraints
- 主线程独占 live browser、E2E、长测试、build 轮询。
- 共享文件 `index.html`、`css/style.css`、`js/ui/toolbar.js` 继续串行集成。
- 优先最小 diff，避免新依赖、避免 fallback 叠层、避免扩大无关范围。
- live code 是唯一真相源；旧归档只保留历史参考价值。

## Acceptance
- Batch 0 到 Batch 3 的真实剩余项全部完成，并有新鲜验证证据。
- `docs/active/maintainability-stability-roadmap/` 成为唯一工作留档。
- 结束前完成 review、查 bug、第一性原理复核、lessons learned 回写。

## Task List
- [x] Batch 0.1：恢复 active 留档并重新核对 live code
- [x] Batch 0.2：修复 Pages dist 漏发 `runtime_asset_registry.json`
- [x] Batch 0.3：确认 transport 当前 `road/rail` 为 preview-only，并修正留档口径
- [x] Batch 1.1：state guardrail ratchet（87 -> 83）
- [x] Batch 1.2：JS/Python 共读 `country_feature_policies.json` v2
- [x] Batch 1.3：feature identity 主路径迁移 + worker 共享 helper 收口
- [x] Batch 2.1：city lights historical 1930 entries 外部化
- [x] Batch 2.2：runtime asset registry 第二波主路径收口
- [x] Batch 2.3：颜色与渲染主动防线
- [x] Batch 3.1：scenario `preCommit -> commit -> postCommit` seam
- [x] Batch 3.2：transport preview registry config-driven factory
- [x] Batch 3.3：`map_renderer.js` 渐进瘦身
- [x] Batch 3.4：`init_map_data.py` stage 化
- [x] 最终验证、review、复盘、归档
