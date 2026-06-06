# Appearance + Transport Platformization Follow-up Task

## Checklist
- [x] Isolate worktree and branch.
- [x] Read prior plans, tests, and lessons.
- [x] Spawn read-only static review subagent.
- [x] Implement registry-driven transport appearance data-layer requests.
- [x] Add targeted behavior test.
- [x] Run targeted Node and Python tests.
- [x] Sync source to `dist/app`.
- [x] Run `npm run verify:pages-dist`.
- [x] Run final review and QA.
- [ ] Commit, push, merge to `main`, and remove worktree.

## Verification Log
- `node --test tests/transport_appearance_controller_behavior.test.mjs`: passed after fixing test harness async cleanup.
- `npm run test:node:transport-appearance-controller`: 2 tests passed.
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_workbench_manifest_runtime_contract -q`: 77 tests passed.
- `node --test tests/transport_appearance_controller_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`: 33 tests passed.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`: 27 tests passed.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_appearance_controller_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`: 60 tests passed.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_appearance_controller_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`: 60 tests passed after restoring global state in the funnel-level import test helper.
- `node --check js/ui/toolbar/transport_appearance_controller.js js/core/interaction_funnel.js js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`: passed.
- `node --check tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_appearance_controller_behavior.test.mjs js/core/interaction_funnel.js js/ui/toolbar/transport_appearance_controller.js js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`: passed.
- `python -m py_compile tests/test_global_transport_builder_contracts.py`: passed.
- `npm run verify:pages-dist`: dist build plus 24 startup-shell tests passed.
- `git diff --check`: passed with Windows line-ending warnings only.
- Final read-only code review: APPROVED, no findings.

## Remaining
- Wait for static review subagent result.
- Commit, push, merge to `main`, and remove worktree after review is clean.
