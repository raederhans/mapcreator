# Renderer SVG Surface Lifecycle Owner P30 Current-Main Takeover

## Task Classification

`complex`: this task touches renderer architecture, production browser JS, tests, dist verification, and worktree registry truth. The main thread owns live tests and browser checks.

## First-Principles Requirement

The real product need is a stable ownership boundary: one small owner should create and register the SVG surface handles, while `map_renderer.js` continues to orchestrate lifecycle ordering and rendering semantics. A correct P30 implementation reduces `map_renderer.js` mechanical setup burden without changing visible rendering behavior.

## Evidence Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p30-renderer-svg-surface-lifecycle-owner-current`
- Branch: `codex/p30-renderer-svg-surface-lifecycle-owner-current`
- Base: `origin/main@d331daae879af0a70312c0f82f9c1a9bfb0e710d`
- Parent checkout is dirty and behind remote, so this clean worktree is the evidence source.

## Live Process Ownership

Main Codex agent owns all validation commands, dist generation, dev-server/browser confidence, and log interpretation. Subagents are read-only/static reviewers.

## Findings So Far

- `renderer_surface_host.js` is a handle registry.
- `renderer_surface_lifecycle_owner.js` is limited to DOM lookup, canvas layer registration, hit canvas creation, and context acquisition.
- `renderer_projection_path_owner.js` is limited to projection/path handle creation and registration.
- `renderer_svg_surface_lifecycle_owner.js` exists on current main and owns SVG root/static group/interaction rect creation and registration.
- `ensureHybridLayers()` remains in `map_renderer.js` and keeps legacy cleanup, canvas lifecycle ordering, SVG owner call, stale legend group cleanup, and `ensureLegendControlElement()`.

## Verification Plan

- Syntax checks for owner, renderer, tests, and architecture tool.
- Required P30 Node tests and neighboring renderer lifecycle suites.
- Architecture boundary, state-write allowlist, test import graph.
- Pages dist and dist drift gates because production browser JS changed in P30.
- Current `origin/main@d331daae` has a known Pages package size gate red light: `1101.80 MiB` exceeds `1024.00 MiB` by `77.80 MiB`. Treat that as a publish-size blocker, while separately checking P30 source/dist path health.
- Diff whitespace check.
- Browser confidence commands when dependencies are available.
- Code review and UltraQA gates after baseline validation.

## Critic Adjustment

- Add path-level status checks for `dist/pages-dist-manifest.json`, `dist/app/js/core/map_renderer.js`, `dist/app/js/core/renderer/renderer_svg_surface_lifecycle_owner.js`, and matching source files.
- Classify `verify:pages-dist` and `verify:dist-drift` failures caused by the known size gate as current-main publish blockers.
- Run separable startup shell and landing showcase checks after the builder gate stops.
- UltraQA must cover existing SVG reuse, missing dependencies, legacy cleanup plus legend ordering, forbidden semantic token boundaries, and dist health classification.

## Validation Log

- `node --check` passed for `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`, `js/core/map_renderer.js`, `tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs`, `tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs`, and `tools/check_architecture_boundaries.mjs`.
- `npm run test:node:renderer-svg-surface-lifecycle-owner` passed 4/4.
- `npm run test:node:renderer-svg-surface-lifecycle-inventory` passed 8/8.
- `npm run test:node:renderer-projection-path-lifecycle` passed 14/14.
- `npm run test:node:renderer-surface-lifecycle` passed 13/13.
- `npm run test:node:renderer-surface-host` passed 12/12.
- `npm run test:node:renderer-host-inventory` passed 7/7.
- `npm run test:node:strategic-overlay-runtime-owner` passed 16/16.
- `npm run test:node:renderer-svg-surface-lifecycle` passed 12/12.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:state-write-allowlist` passed with 115 tracked files.
- `npm run verify:test-import-graph` passed and wrote import graph for 49 specs.
- `git diff --check` passed.
- `npm run verify:pages-dist` stopped at the known current-main Pages size gate: `1101.80 MiB` over `1024.00 MiB` by `77.80 MiB`.
- `npm run verify:dist-drift` stopped at the same current-main Pages size gate before diff comparison.
- Path-level status after the Pages builder attempts shows no drift in P30 source/dist files or `dist/pages-dist-manifest.json`.
- Separate Pages checks passed after the size gate stopped the chained script: startup shell 39/39 and landing showcase 9/9.
- Browser confidence commands are blocked in this clean worktree because `node_modules/@playwright/test/cli.js` does not exist.

## UltraQA Report

### Goal and success criteria

- Goal: confirm current-main P30 SVG lifecycle owner is behaviorally scoped to SVG root/static group/interaction rect creation and registration.
- Stop condition: P30 owner tests, boundary checks, source/dist path health, and adversarial harness evidence are clean; known current-main size gate is classified separately.
- Safety bounds: no production writes, no destructive cleanup, no browser process without installed Playwright dependency, temporary harness only under `.runtime/tmp/`.

### Scenario matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADV-P30-001 | Normal renderer startup | Fresh SVG surface creation and registration | `npm run test:node:renderer-svg-surface-lifecycle-owner` | Creates root/groups/rect in required order and registers handles | 4/4 passed | passed | owner behavior test output | no temp artifact |
| ADV-P30-002 | Repeated startup / stale DOM | Existing `#map-svg` is reused without duplicate root nodes | `npm run test:node:renderer-svg-surface-lifecycle-owner` | Existing root reused; one `#map-svg` | 4/4 passed | passed | owner behavior test output | no temp artifact |
| ADV-P30-003 | Malformed dependency surface | Missing host/getD3/setter/mapContainer/d3.select fail fast | `npm run test:node:renderer-svg-surface-lifecycle-owner` | TypeError before partial success claim | 4/4 passed | passed | owner behavior test output | no temp artifact |
| ADV-P30-004 | Semantic boundary injection | SVG owner must not contain runtime/render/projection/legend tokens | `npm run test:node:renderer-svg-surface-lifecycle-inventory`; `npm run verify:architecture-boundaries` | Forbidden tokens absent; import direction held | inventory 8/8, architecture passed | passed | static boundary output | no temp artifact |
| ADV-P30-005 | Dist drift / misleading publish status | Pages size gate red should not be called P30 behavior failure | `npm run verify:pages-dist`; `npm run verify:dist-drift`; path-level `git status` | Size gate classified; P30 source/dist paths remain clean | both scripts stopped at known size gate; P30 paths clean | passed with known blocker | `1101.80 MiB` over `1024.00 MiB` by `77.80 MiB`; path-level status empty | no temp artifact |
| ADV-P30-006 | Hostile stale DOM ordering | Existing root has stale child before owner runs | temporary `.runtime/tmp/p30-ultraqa-svg-owner-harness.mjs` | Owner reuses root, completes groups, lowers interaction rect | harness passed | passed | `P30 UltraQA harness passed...` | harness deleted |
| ADV-P30-007 | Browser confidence | Real browser checks for TNO ready state, smoke, strategic overlay, scenario chunk runtime | `npm run test:e2e:*` commands | Playwright CLI available and tests run | blocked by missing `node_modules/@playwright/test/cli.js` | blocked | dependency check returned `False` | no process started |

### Commands run

- `[0]` syntax check chain for owner, renderer, P30 tests, and architecture tool.
- `[0]` P30 and adjacent renderer Node lifecycle suites.
- `[0]` architecture boundary, state-write allowlist, import graph, and diff whitespace checks.
- `[1]` `npm run verify:pages-dist` stopped at known current-main Pages size gate.
- `[1]` `npm run verify:dist-drift` stopped at the same size gate before diff comparison.
- `[0]` startup shell 39/39 and landing showcase 9/9.
- `[0]` temporary UltraQA harness under `.runtime/tmp/`, then deleted.

### Failures found

- No P30 owner behavior failure found.
- Current-main publish-size blocker remains: Pages dist is `77.80 MiB` over the configured limit.
- Browser confidence is dependency-blocked in this clean worktree.

### Fixes applied

- No production-code fix was needed.
- Added current-main takeover context and registry truth.

### Cleanup and rollback

- Temporary UltraQA harness was deleted after passing.
- No spawned browser/dev-server process was started.

### Residual risks

- Token-based boundary tests can miss semantically equivalent renamed behavior or flag harmless text movement.
- Real browser click/layering confidence remains unrun until Playwright dependencies exist in this worktree.
- Architect review returned `WATCH`: current P30 boundary is acceptable, with future maintainability suggestions to add explicit group `handleName` entries beside setters and consider a small `cleanupLegacyHybridArtifacts()` helper in a later phase.

### Harness evidence detail

ADV-P30-006 used a temporary `.runtime/tmp/p30-ultraqa-svg-owner-harness.mjs` file with a minimal fake SVG document, fake D3 selection, and a fake surface host. The harness pre-created `#map-svg` with a stale child, then called `createRendererSvgSurfaceLifecycleOwner(...).ensureSvgSurface()`. Assertions checked that the existing root was reused, only one `#map-svg` remained, `interactionRect.lower()` ran once, the interaction rect became the first child, required groups including `operation-graphics-editor-layer` and `inspector-highlight-layer` existed, and the first setter calls were `setMapSvg`, `setViewportGroup`, and `setStrategicDefs`. Command: `node .runtime/tmp/p30-ultraqa-svg-owner-harness.mjs`. Output: `P30 UltraQA harness passed: reused existing SVG root, completed groups, and lowered interaction rect.` The temporary file was deleted after the run.

## Delivery Package

1. What changed: added current-main takeover evidence for P30, recorded known Pages size gate classification, documented UltraQA scenarios, and updated worktree registry truth. No production renderer code was changed.
2. Files changed: core files none; test files none; documentation files `docs/active/renderer-svg-surface-lifecycle-owner-p30-current-20260629/context.md`, `docs/active/_worktree_registry.md`, and `lessons learned.md`; temporary QA harness was created under `.runtime/tmp/` and deleted.
3. Diff summary: registry current-worktree truth, one new current-main takeover context document, and one Lessons Learned entry about separating Pages size gate from owner verification.
4. Commit status: not committed yet at this checkpoint.
5. Base divergence: worktree started at `origin/main@d331daae`; local branch has documentation/registry changes only.
6. Potential conflicts: red with future edits to `docs/active/_worktree_registry.md`; yellow with concurrent Phase2A Pages slimming docs/registry; green for P30 production files because none were changed.
7. Validation run: syntax checks; P30 owner/inventory; projection/surface/host/strategic owner suites; architecture boundary; state-write allowlist; test import graph; diff check; startup shell; landing showcase; temporary UltraQA harness.
8. Validation blockers: current-main Pages size gate remains red; browser confidence blocked by missing Playwright CLI in this clean worktree.
9. Recommended next step: merge/push documentation and registry truth, then remove this temporary worktree after the pushed commit is recoverable.
10. Integration status: ready for integration as a verification-only closeout after code-review findings are resolved.
