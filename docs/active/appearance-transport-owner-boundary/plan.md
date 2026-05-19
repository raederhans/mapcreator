# Appearance Transport Owner Boundary Plan

## 2026-05-19 next ultragoal slice

Goal: continue G001 by reducing overloaded appearance + transport UI owner coupling while preserving behavior and performance.

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-appearance-transport-owner-boundary-2026-05-19`
Branch: `codex/appearance-transport-owner-boundary-2026-05-19`

## Constraints

- Main thread owns all live tests, browser runs, benchmarks, dev servers, commits, merge, and push.
- Subagents are static-only evidence lanes unless explicitly reassigned.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` stay out of this slice unless current evidence proves they are required.
- This slice should reduce owner coupling, not expand UI scope or change transport data semantics.

## Acceptance

- A concrete appearance/transport owner boundary is moved out of an overloaded controller into a narrow module.
- Existing behavior is preserved by extending an existing test entrypoint.
- Targeted syntax and contract tests pass.
- Active docs record the boundary, evidence, and residual risks.
- Final static review finds no current-scope blocker.

## Candidate directions

- Appearance transport controls: extract DOM/control collection and repetitive family config update helpers from `appearance_controls_controller.js`.
- Transport workbench controller: extract a low-risk helper from `transport_workbench_controller.js` after static evidence identifies a bounded seam.
- Tests: prefer extending `tests/test_toolbar_split_boundary_contract.py`, `tests/test_ui_rework_plan03_support_transport_contract.py`, and `tests/transport_overview_line_strategy_scope_contract.node.test.mjs`.

## Progress

- [x] Created isolated worktree.
- [x] Loaded ultragoal and ultrawork instructions.
- [x] Read project AGENTS and lessons learned.
- [x] Dispatched static-only evidence lanes.
- [x] Choose the smallest boundary move with current evidence.
- [x] Implement boundary move.
- [x] Run targeted verification.
- [x] Run static review and close this slice.
