# Stage 3: Political Core and Resolved Color Readiness

## Baseline

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-stage3-political-color-readiness`
- Branch: `stage3-political-color-readiness`
- Base: `origin/main@b2f3a97ef073bf5cc4c7743ede3ea079f0530471`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` remains dirty with unrelated docs WIP and must stay untouched.

## Success Criteria

Stable visible frames must not report:

- `resolved-colors-empty-with-land`
- `political-visible-subset-empty-with-required-chunks`
- `render-reuse-across-data-generation`
- `pending-color-edit-cleared-without-render`

Stable frames include post-apply complete, chunk-promotion visual complete, visible-frame committed/reused, exact-after-settle refresh, and fill action render confirmation. Early transient diagnostics may remain if they are clearly classified.

## Non-Goals

- Water/Atlantropa required semantic layer coverage
- Chunk selection budget or LOD strategy
- Worker, OffscreenCanvas, WebGL, vector tile defaults
- Render budget hints and performance thresholds
- Scenario apply queue ownership changes from stage 2

## Execution Plan

1. Reproduce and classify current warning phases with render diagnostics.
2. Trace political chunk payload readiness from selection/load/merge through stable refresh.
3. Trace resolved color readiness from land payloads through color rebuild and draw paths.
4. Add focused failing tests for stable-frame violations found in evidence.
5. Implement the smallest source fix that addresses the proven root cause.
6. Validate with targeted Node tests, syntax checks, Pages dist gate, and one runtime/browser sampling pass.
7. Run final cleanup/review gate, update worktree registry, and prepare integration.

## Live Process Ownership

The main Codex agent owns dev server, browser/runtime sampling, long tests, and build commands. Subagents may only do static code mapping, static test suggestions, and final independent review unless reassigned here.
