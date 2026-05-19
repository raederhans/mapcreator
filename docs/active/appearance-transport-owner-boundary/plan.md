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
- [x] Pushed implementation to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench preview runtime hooks owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-preview-runtime-owner-2026-05-19`
Branch: `codex/transport-workbench-preview-runtime-owner-2026-05-19`

Goal: continue G001 by moving transport workbench preview warmup and runtime listener registration into the preview lifecycle owner.

Acceptance:

- `transport_workbench_preview_lifecycle_owner.js` owns warmup scheduling, carrier view listener registration, family preview selection listener registration, and preview selection refresh callbacks.
- `transport_workbench_controller.js` keeps the toolbar-visible runtime initialization entrypoint and delegates to `initializeRuntimeHooks()`.
- Closing the workbench keeps the carrier view listener available after carrier disposal.
- Existing Python contracts and a named Node behavior test cover the boundary and runtime hook behavior.
- Targeted syntax, Python contracts, Node behavior, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Loaded ultragoal, ultrawork, research-before-fix, performance-goal, Ralph, AGENTS, active docs, and lessons.
- [x] Dispatched static-only evidence lanes for runtime hook boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented preview runtime hook owner split.
- [x] Updated existing contracts and added named Node behavior script.
- [x] Ran initial targeted verification.
- [x] Run final static review.
- [x] Pushed implementation to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench inspector owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-inspector-owner-2026-05-19`
Branch: `codex/transport-workbench-inspector-owner-2026-05-19`

Goal: continue G001 by moving transport workbench inspector row models and diagnostic summaries out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_inspector_owner.js` owns inspector formatters, manifest-only rows, diagnostic rows, lens summary rows, state-card models, and small inspector DOM row/card factories.
- `transport_workbench_controller.js` keeps tab switching, shell rendering, render context, row insertion, and selected-family refresh sequencing.
- Existing Python contracts and a named Node behavior test cover the boundary and representative row-model behavior.
- Targeted syntax, Python contracts, Node behavior tests, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Dispatched static-only evidence lanes for inspector boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented inspector owner split.
- [x] Updated contracts and added named Node behavior script.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench inspector row metadata slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-row-meta-owner-2026-05-19`
Branch: `codex/transport-workbench-row-meta-owner-2026-05-19`

Goal: continue G001 by moving transport workbench inspector row style semantics out of the controller and into the inspector owner.

Acceptance:

- `transport_workbench_inspector_owner.js` owns `is-summary`, `is-selected`, and `is-governance` row class decisions.
- `transport_workbench_controller.js` only passes row metadata to the owner row factory and appends returned DOM nodes.
- Existing Python and Node tests lock the owner boundary and row class semantics.
- A named toolbar split boundary script exists so this contract has a direct verification entrypoint.
- Targeted syntax, Python contracts, Node behavior, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Dispatched static-only evidence lanes for row metadata boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented row metadata owner split.
- [x] Updated contracts and existing Node behavior script.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench layer order owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-layer-order-owner-2026-05-19`
Branch: `codex/transport-workbench-layer-order-owner-2026-05-19`

Goal: continue G001 by moving transport workbench layer-order panel rendering and drag/drop behavior out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_layer_order_owner.js` owns layer-order row models, live/metadata/reserved status copy, drag state, drop handling, DOM row rendering, and rerender callback sequencing.
- `transport_workbench_controller.js` only wires the owner dependencies and exposes the render entrypoint used by preview lifecycle callbacks.
- Existing Python contracts and a named Node behavior test cover the new owner boundary and drop side-effect order.
- Targeted syntax, Python contracts, Node behavior, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Dispatched static-only evidence lanes for layer-order boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented layer-order owner split.
- [x] Updated contracts and added named Node behavior script.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench right deck owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-next-owner-2026-05-19`
Branch: `codex/transport-workbench-next-owner-2026-05-19`

Goal: continue G001 by moving right-deck control rendering and tab-section DOM wiring out of the overloaded workbench controller.

Acceptance:

- `transport_workbench_right_deck_owner.js` owns control DOM factories, right-deck section nodes, density shell cards, advanced range controls, active-tab panel rendering, and control event wiring.
- `transport_workbench_controller.js` keeps overlay lifecycle, render context construction, state-owner writes, preview refresh sequencing, and right-deck dependency injection.
- Config/display config updates avoid the previous duplicate explicit tab render because `renderTransportWorkbenchInspector()` already refreshes the right deck.
- Existing Python contracts and a named Node behavior test cover the new owner boundary, control event commits, compare-held read-only behavior, section open state, active-tab-only rendering, and advanced range writes.
- Targeted syntax, Python contracts, Node behavior, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Dispatched static-only evidence lanes for right-deck boundary and test entrypoints.
- [x] Selected current-scope boundary move.
- [x] Implemented right-deck owner split.
- [x] Updated contracts and added named Node behavior script.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench right deck render dedupe slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-rightdeck-dedupe-2026-05-19`
Branch: `codex/transport-workbench-rightdeck-dedupe-2026-05-19`

Goal: continue G001 by removing the remaining duplicate right-deck active-tab render from full transport workbench UI refresh.

Acceptance:

- `renderTransportWorkbenchShell()` updates shell chrome, titles, tabs, preview visibility, and apply/compare controls without rendering right-deck control tabs.
- `renderTransportWorkbenchInspector()` remains the single right-deck active-tab render path for full UI refresh and inspector-tab clicks.
- Existing Python boundary contract locks this sequencing so shell refresh cannot reintroduce right-deck DOM work.
- Targeted syntax, toolbar split contract, right-deck behavior, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Selected current-scope boundary move.
- [x] Removed duplicate shell-level right-deck render.
- [x] Updated boundary contract.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench inspector detail cache slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-inspector-owner-2026-05-19`
Branch: `codex/transport-workbench-inspector-owner-2026-05-19`

Goal: continue G001 by reducing repeated inspector DOM rebuilds when the rendered inspector model has not changed.

Acceptance:

- `transport_workbench_inspector_owner.js` owns inspector detail model signature comparison and DOM reuse.
- `transport_workbench_controller.js` passes the inspector mount and render inputs to the inspector owner, while keeping shell/lens/right-deck orchestration unchanged.
- Same rendered model skips `replaceChildren()` and row/card node rebuild; changed model invalidates the cache and renders normally.
- Existing toolbar boundary contract and inspector-owner Node test cover the new owner boundary and cache behavior.
- Targeted syntax, toolbar split contract, inspector owner behavior, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Selected current-scope boundary move.
- [x] Implemented inspector detail DOM reuse.
- [x] Updated boundary and behavior tests.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench shell pack select cache slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-shell-pack-cache-2026-05-19`
Branch: `codex/transport-workbench-shell-pack-cache-2026-05-19`

Goal: continue G001 by avoiding repeated pack select option DOM rebuilds during shell refreshes when the available pack list is unchanged.

Acceptance:

- Shell refresh still updates pack select disabled state and selected value every time.
- Pack option nodes are rebuilt only when the pack id/label list changes.
- `renderTransportWorkbenchShell()` remains chrome-only and delegates pack select option reuse to a narrow helper.
- Existing toolbar boundary contract locks the helper and prevents direct `replaceChildren()` from returning to the shell body.
- A named Node behavior script covers option reuse, selected value refresh, disabled-state refresh, and list-change rebuild.
- Targeted syntax, toolbar split contract, import smoke, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Selected current-scope boundary move.
- [x] Implemented pack select option reuse.
- [x] Updated boundary and behavior tests.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench lens owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-lens-owner-2026-05-19`
Branch: `codex/transport-workbench-lens-owner-2026-05-19`

Goal: continue G001 by moving left-column lens DOM rendering out of the transport workbench controller and skipping repeated lens DOM rebuilds when the rendered lens model is unchanged.

Acceptance:

- `transport_workbench_lens_owner.js` owns lens model creation, review-focus/current-context card DOM, layers empty card DOM, and lens render signature reuse.
- `transport_workbench_controller.js` keeps preview snapshot/data-contract lookup and delegates lens DOM rendering to the lens owner.
- Same rendered lens model skips `replaceChildren()`; family, compare, status, row content, or copy changes invalidate the lens signature and rebuild normally.
- Existing toolbar boundary contract and a named Node behavior script cover the owner boundary, stale lens risks, same-model reuse, and changed-model invalidation.
- Targeted syntax, toolbar split contract, lens owner behavior, import smoke, adjacent owner tests, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Selected current-scope boundary move.
- [x] Implemented lens owner split and DOM reuse.
- [x] Updated boundary and behavior tests.
- [x] Run targeted verification.
- [x] Run final static review.
- [x] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.

## 2026-05-19 transport workbench popover owner slice

Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-popover-owner-2026-05-19`
Branch: `codex/transport-workbench-popover-owner-2026-05-19`

Goal: continue G001 by moving info/help popover DOM, focus, positioning, and section-help button wiring out of the transport workbench controller.

Acceptance:

- `transport_workbench_popover_owner.js` owns info popover content DOM, section-help content DOM, section-help positioning, focus restore, Escape handling, and section help button creation.
- `transport_workbench_controller.js` keeps workbench lifecycle, render context, state writes, preview/apply sequencing, and only delegates popover operations through the owner.
- Opening info/help popovers remains mutually exclusive, same section help click collapses the active popover, and Escape closes the active popover before closing the whole workbench.
- Existing toolbar boundary contract and a named Node behavior script cover the owner boundary, aria state, focus restore, mutual exclusion, and Escape handling.
- Targeted syntax, toolbar split contract, popover owner behavior, import smoke, adjacent workbench owner tests, static review, push, and worktree cleanup pass.

Progress:

- [x] Created isolated worktree from `origin/main`.
- [x] Selected current-scope boundary move.
- [x] Implemented popover owner split.
- [x] Updated boundary and behavior tests.
- [x] Run targeted verification.
- [x] Run final static review.
- [ ] Push to `origin/main`; temporary worktree cleanup follows this closeout commit.
