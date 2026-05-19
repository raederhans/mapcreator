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

## 2026-05-19 transport workbench config owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-config-owner-2026-05-19`
Branch: `codex/transport-workbench-config-owner-2026-05-19`

Goal: continue G001 by moving the transport workbench family/config normalization matrix out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_config_owner.js` owns runtime family ids, inspector tab ids, family id normalization, layer order normalization, label-level mapping, enum/multi helpers, and per-family workbench config normalization.
- `transport_workbench_controller.js` keeps runtime state repair, DOM rendering, preview lifecycle, and apply bridge behavior unchanged for this slice.
- Existing contract tests are updated to lock the new config owner.
- Targeted syntax, ES module import smoke, Python contracts, Node transport contract, state-write guardrail, and static review pass.

Progress:

- [x] Created isolated worktree.
- [x] Re-read ultragoal, ultrawork, agent tiers, lessons, active docs, and relevant memory.
- [x] Dispatched static-only evidence lanes.
- [x] Selected current-scope boundary move.
- [x] Extracted config normalization owner.
- [x] Updated existing contracts.
- [x] Ran targeted verification.
- [x] Ran final static review.
- [x] Merged, pushed, and cleaned worktree.

## 2026-05-19 transport workbench apply bridge owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-apply-owner-2026-05-19`
Branch: `codex/transport-workbench-apply-owner-2026-05-19`

Goal: continue G001 by moving transport workbench main-map apply bridge decisions out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_apply_bridge_owner.js` owns active pack resolution, instance-scoped pack gate cache, apply button state, workbench-to-overview patch execution, overlay state loading, dirty marking, and render trigger.
- `transport_workbench_controller.js` keeps DOM event binding, shell rendering, preview lifecycle, and current render context.
- Existing Python and Node contracts lock the apply bridge order and the main-map patch shape.
- Targeted syntax, Python contracts, Node transport contract, state-write guardrail, static review, merge, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree.
- [x] Dispatched static-only evidence lanes for apply boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented apply bridge owner split.
- [x] Updated existing contracts.
- [x] Ran targeted verification.
- [x] Ran final static review.
- [x] Pushed implementation to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench preview lifecycle owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-preview-owner-2026-05-19`
Branch: `codex/transport-workbench-preview-owner-2026-05-19`

Goal: continue G001 by moving transport workbench preview render lifecycle out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_preview_lifecycle_owner.js` owns render generation, live-preview clearing, carrier preparation, view sync RAF, inspector refresh after preview completion, and preview/carrier disposal.
- `transport_workbench_controller.js` keeps DOM buttons, shell rendering, runtime init, warmup scheduling, selection listener wiring, and render context.
- Existing contracts lock generation guards, view-key dedupe, close disposal, family preview dispatch, and controller facade.
- Targeted syntax, Python contracts, Node import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Dispatched static-only evidence lanes for preview lifecycle and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented preview lifecycle owner split.
- [x] Updated existing contracts.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Pushed implementation to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench state owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-state-owner-2026-05-19`
Branch: `codex/transport-workbench-state-owner-2026-05-19`

Goal: continue G001 by moving transport workbench local UI state normalization and mutations out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_state_owner.js` owns workbench UI state normalization, active pack/family/tab writes, config/display config mutations, section open state, layer order movement, and open/close restore flags.
- `transport_workbench_controller.js` keeps DOM event binding, shell rendering, preview/apply owner wiring, render context, and repaint sequencing.
- Existing contracts lock the new owner boundary and the state-writer allowlist moves from controller to state owner.
- A named Node behavior script covers state-owner object identity, active pack updates, compare-mode read-only behavior, density display writes, and layer-order preservation.
- Targeted syntax, Python contracts, Node state-owner behavior, state-write guardrail, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Loaded ultragoal, ultrawork, research-before-fix, performance-goal, and Ralph instructions.
- [x] Dispatched static-only evidence lanes for next owner boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented state owner split.
- [x] Updated existing contracts and added named Node behavior script.
- [x] Ran initial targeted verification.
- [x] Run final static review.
- [ ] Push and clean worktree.
