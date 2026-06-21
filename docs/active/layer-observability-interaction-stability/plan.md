# Layer Observability and Interaction Stability Plan

## Goal

Make Appearance and Map Content layer state easier to diagnose without changing visual defaults. Coalesce high-frequency Appearance render requests into one frame so slider input does less duplicate work.

## Constraints

- Keep current default appearance values unchanged.
- Do not add data sources, renderer rewrites, schema changes, or expensive spatial queries.
- Keep diagnostics lightweight and based on existing `runtimeState`, transport registry metadata, and render metrics.
- Main Codex agent owns live tests and build commands.

## Steps

1. [x] Create isolated worktree from current `origin/main`.
2. [x] Diagnose state sources, render request path, transport support metadata, and current test anchors.
3. [x] Add pure layer diagnostics helpers for Appearance and Map Content status summaries.
4. [x] Add a requestAnimationFrame render scheduler for Appearance control updates.
5. [x] Wire status summaries into existing panel headings and transport overview support copy.
6. [x] Add focused Node tests for summaries, disabled reasons, unsupported transport families, clean text, and render batching.
7. [x] Run targeted validation and boundary checks.
8. [x] Run independent code review and architect review lanes, then fix accepted findings.
9. [x] Update worktree registry with the delivery package.

## Acceptance

- Appearance and Map Content panels show concise status text for required layer groups.
- Transport master enabled with zero selected families is visible as a specific state.
- Transport workbench-only families expose their disabled reason from registry support.
- Bathymetry disabled/experimental state is explainable from existing state.
- Slider/input bursts call the underlying `renderDirty` once per frame.
- Defaults remain unchanged.
