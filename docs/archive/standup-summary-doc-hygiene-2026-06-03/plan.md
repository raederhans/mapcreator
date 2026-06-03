# standup-summary-doc-hygiene-2026-06-03 plan

## Goal

收紧 `lessons learned.md` 的长期规则口径，并把 `docs` 里已经完成、重复、低价值的留档残留清掉，同时保留仍有后续价值的计划和决策记录。

## Steps

1. 复核当前 `lessons learned.md` 和既有 dirty diff，避免覆盖正在进行的留档修改。
2. 只保留长期规则、项目级合同、可复用决策；删除一次性快照和已收口窄问题。
3. 对 `docs/active` 做真实状态核对；有 archive 完整副本且内容已完成的目录直接收口。
4. 对候选 archive 做引用和价值检查；仅删除低价值、被后续 run 覆盖的旧留档。
5. 执行 `git diff --check -- "lessons learned.md" docs`，确认本轮改动只停留在 docs。

## Live Ownership

主线程独占本轮 docs 清理与验证；无 live build、browser、test 进程。
