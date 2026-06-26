# P15 Render Transform Reuse Policy Owner Plan

## Goal

Move contextBase/contextScenario transform reuse decisions and exact-after-settle fast-path readiness policy out of `js/core/map_renderer.js` into `js/core/renderer/render_transform_reuse_policy_owner.js`.

## Boundaries

- Preserve `map_renderer.js` wrapper function names and render pipeline / exact scheduler helper keys.
- Do not modify `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.
- Do not modify DOM, canvas, SVG, projection, zoom lifecycle, `renderPassToCache`, `drawCanvas`, `scenario_refresh_runtime.js`, or `exact_after_settle_scheduler.js` state machine.
- Avoid touching `js/core/renderer/render_pipeline_passes.js`.

## Steps

1. Baseline and context
   - Confirm parent WIP and clean P15 worktree from latest `origin/main`.
   - Map existing constants/functions/callers and owner patterns.
2. Owner extraction
   - Add `createRenderTransformReusePolicyOwner`.
   - Inject state/constants/getters/helpers.
   - Delegate existing `map_renderer.js` wrappers to the owner.
3. Contract coverage
   - Add synthetic owner behavior tests without DOM or d3.
   - Add package script and architecture boundary tokens.
4. Verification
   - Run syntax checks, focused Node suites, architecture/static gates, import graph, and requested e2e gates from the main agent only.
   - Run final static review and first-principles bug check.
5. Closeout
   - Commit functional change with Lore protocol.
   - Push recovery branch and `main`.
   - Archive docs, update registry, push closeout, then clean the worktree.
