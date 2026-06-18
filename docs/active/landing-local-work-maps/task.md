# Landing Local Work Maps Task

## Scope

In scope:
- Landing bento work-card visual assets and their metadata.
- Landing and dist image references/alt copy.
- Rasterization target list and Pages dist sync.
- Worktree registry delivery notes for this task.

Out of scope:
- Editor runtime behavior.
- Scenario source data mutation.
- README edits.
- New dependencies.

## Delivery Package

1. Changed what:
- Added a dedicated landing work-card map asset builder for TNO Atlantropa, HOI4 scenario switch, and Japan corridor atlas.
- Generated SVG, WebP, and JSON metadata outputs for all three maps in `landing/assets` and `dist/assets`.
- Replaced the three bento work-card image references and aligned English/Chinese copy plus alt text.
- Added metadata/source-path coverage to the existing landing showcase Node test.
- Refined asset text placement after browser screenshots showed TNO card title cropping.
- Reworked the TNO card after browser feedback so it uses full-Mediterranean, owner-dissolved country surfaces from detail chunks and no internal block boundaries.
- Fixed final static review findings by removing visible `scenario_water` topology blocks, rendering all clipped Atlantropa features, and adding a TNO-specific static contract test.

2. Changed files:
- Core files: `tools/build_landing_work_maps.py`, `tools/rasterize_landing_assets.py`, `package.json`.
- Landing files: `landing/index.html`, `landing/app.js`, `landing/assets/work-alt-history-med.*`, `landing/assets/work-scenario-switch-europe.*`, `landing/assets/work-atlas-japan-corridor.*`.
- Dist files: `dist/index.html`, `dist/app.js`, `dist/assets/work-alt-history-med.*`, `dist/assets/work-scenario-switch-europe.*`, `dist/assets/work-atlas-japan-corridor.*`, `dist/pages-dist-manifest.json`.
- Test files: `tests/landing_showcase_view_behavior.test.mjs`.
- Test files: `tests/test_pages_dist_startup_shell.py`.
- Docs: `docs/active/landing-local-work-maps/plan.md`, `docs/active/landing-local-work-maps/context.md`, `docs/active/landing-local-work-maps/task.md`, `docs/active/_worktree_registry.md`, `.omx/context/landing-local-work-maps-20260617T182853Z.md`.

3. Diff summary:
- Adds a new source-backed map builder that clips real scenario/resource data by fixed local bboxes and emits metadata with source paths, feature counts, bbox, and selection policy.
- TNO `work-alt-history-med` now reads `political.detail.country.*` chunk sources selected by bbox, dissolves them by owner, and renders Atlantropa land/shoal without tile-like water or relief block outlines.
- TNO metadata now records `source_atlantropa_features=896` and `rendered_atlantropa_features=896`, and no longer lists `runtime_topology.topo.json` as a rendered source for the work-card map.
- Extends rasterization so the three new SVGs are optimized and converted to WebP.
- Updates the homepage bento cards without changing the bento layout structure.
- Extends Pages dist startup contracts so all nine new work-card asset files are required and byte-matched between `landing/assets` and `dist/assets`.

4. Commit state:
- Clean integration branch `codex/landing-work-maps-integration` was created from `origin/main@6874731f` so the landing asset work can be committed independently from the parent checkout's renderer WIP.

5. Base divergence:
- Original source checkout at task start: branch `codex/tno-political-color-recovery`, HEAD `a4957713`.
- Integration base: `origin/main@6874731f`.

6. Potential conflicts:
- Direct file overlap risk: `package.json`, `dist/index.html`, `dist/app.js`, `dist/assets`, `dist/pages-dist-manifest.json`.
- Semantic overlap risk: Pages dist build surfaces and landing asset pipeline.
- Renderer runtime files in the parent checkout are outside this task's intended scope and were left out of the clean integration branch.

7. Verification:
- `py -3 -m py_compile tools\build_landing_work_maps.py tools\rasterize_landing_assets.py`: passed.
- `py -3 tools\build_landing_work_maps.py`: passed.
- `py -3 tools\rasterize_landing_assets.py`: passed.
- `py -3 tools\build_pages_dist.py`: passed, latest total size `1099.51 MiB`.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: passed, 37 tests.
- `npm run test:node:landing-showcase-view`: passed, 8 tests.
- `git diff --check`: passed with CRLF warnings only.
- Browser check at `http://localhost:8000/`: images loaded, no console/page/network failures.
- TNO browser fix screenshot: `.runtime/browser/landing-tno-atlantropa-fix-final.png`.
- Final TNO no-block screenshot: `.runtime/browser/landing-tno-atlantropa-no-blocks-final.png`.
- Static asset presence and reference checks passed during implementation.

8. Remaining risks:
- `npm run verify:pages-dist` depends on `python` resolving in Windows cmd; this machine resolves `py -3`, so the equivalent chain was used.
- The parent checkout has unrelated renderer/runtime WIP; this clean branch should be integrated without staging the parent checkout wholesale.

9. Recommended next step:
- Commit the clean integration branch, fast-forward merge it into `main`, and push `origin/main`.

10. Integration status:
- Ready for clean branch commit and fast-forward merge.
