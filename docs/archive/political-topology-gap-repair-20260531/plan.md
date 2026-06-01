# Political topology gap repair plan

## Acceptance
- Confirm whether the diagnosis matches current code and checked-in data.
- Preserve French overseas primary components when mainland France is replaced by detail features.
- Preserve geoBoundaries ADM1 shapes for Somalia/Somaliland when Africa detail features are finalized.
- Add targeted contract tests for both failure modes.
- Rebuild affected topology outputs only if the targeted code and tests pass.
- Run targeted unit tests and source/dist delivery gate when checked-in runtime data changes.

## Steps
- [x] Read project rules, lessons learned, requested skills, and bug report.
- [x] Create isolated worktree `codex/fix-political-holes`.
- [x] Launch read-only subagents for code mapping, test mapping, and architecture review.
- [x] Add regression tests that fail on the current behavior.
- [x] Implement the shortest code changes in the topology merge and Africa admin1 processor.
- [x] Rebuild `data/europe_topology.na_v2.json` and `data/europe_topology.runtime_political_v1.json` if needed.
- [x] Verify French overseas and Somalia/Somaliland coverage with data-level checks.
- [x] Run final code review, bug review, and first-principles simplification pass.
- [ ] Archive this task folder after completion.
