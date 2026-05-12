# Appearance + Transport Platformization Task

## Docs 收口

- [x] 创建 `docs/active/appearance-transport-platformization/`。
- [x] 创建当前主任务 `plan.md`。
- [x] 创建当前主任务 `context.md`。
- [x] 创建当前主任务 `task.md`。
- [x] 融合 `docs/active/color-library-improvement/` 剩余项。
- [x] 融合 `docs/active/transport-panel-visibility/` 剩余项。
- [x] 明确主线、已完成项、剩余验证项、归档条件。

## 主线程后续验证

- [x] 补跑 Color Library Playwright E2E。
- [x] 补跑 browser quick inspection。
- [x] 补做 Color Library review-查 bug-第一性原理复核。
- [x] 补做完整 `tno_1962` transport visual validation。
- [x] 复核 `tests/test_global_transport_builder_contracts.py` 的旧静态 contract failure。
- [x] 将验证结果追加到 `context.md`。

## 当前阶段收口

- [x] 确认当前主线 appearance + transport 收口完成。
- [x] 将 `docs/active/color-library-improvement/` 移入 `docs/archive/`。
- [x] 将 `docs/active/transport-panel-visibility/` 移入 `docs/archive/`。

## 下一阶段 backlog

- [x] 修复 `data/manifest.json` / `data/locales.json` drift。
- [x] 完成 state allowlist 第一批 ratchet：`83 -> 81`。
- [x] 完成 state allowlist 第二批 ratchet：`81 -> 80`。
- [x] 继续下一批 state allowlist ratchet：`80 -> 77`。
- [x] 继续 `map_renderer.js` owner extraction：transport overview + river layer owner 下沉完成。
- [x] 继续 `init_map_data.py` stage seam 深化：`hierarchy_locales` owner 下沉完成。
- [x] backlog 验证结果继续写入 `context.md`。

## 2026-05-11 追加收口

- [x] 修复 special zone workbench / render owner 新增直接 state 写口。
- [x] state write allowlist 继续收紧：`77 -> 73`。
- [x] 收紧 transport manifest `feature_counts` 合同，排除 boolean count。
- [x] 收紧 carrier manifest 豁免条件：只允许 `family=carrier` 且 `geometry_kind=carrier` 的真实 carrier manifest 豁免。
- [x] 补跑 targeted Python / Node / manifest checker 验证。
