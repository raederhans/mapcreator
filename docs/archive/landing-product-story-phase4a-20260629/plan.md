# Phase 4A Landing Product Story Plan

## Scope

- Add a source-backed interactive story section to the landing page after Selected works.
- Keep editor runtime, scenario runtime data, and Pages publishing policy unchanged.
- Reuse existing landing images and metadata; no new media assets are planned.

## Plan

- [x] Confirm base, active worktree, existing landing contracts, and Pages dist size policy.
- [x] Add `#story` HTML with five narrative steps, scenario comparison controls, and evidence markers.
- [x] Add `initProductStory()` in `landing/app.js`, separate from hero, showcase, and preview initializers.
- [x] Add responsive sticky-stage styling, active states, focus states, and reduced-motion-safe transitions.
- [x] Extend landing Node and Pages startup-shell tests for story behavior, source markers, fixed story title sizing, and the 950 MiB preferred target.
- [x] Rebuild Pages dist and run the requested validation commands.
- [x] Run independent review lanes, fix findings, and update this plan with the delivery package.
- [ ] Commit, push, and integrate after final staging gates pass.

## Live Process Owner

Main Codex agent owns all live commands: Pages builder, Node tests, Python unittest, and diff checks. Subagents are static/read-only unless explicitly reassigned.

## Delivery Package

1. Added a source-backed interactive story section after Selected works, with five steps from baseline selection to export-ready map.
2. Added a focused `initProductStory()` owner for story state, keyboard navigation, comparison switching, image/alt syncing, and evidence highlighting.
3. Added responsive sticky-stage styling with reduced-motion-safe behavior and fixed story title font sizes.
4. Added landing behavior tests for evidence markers, click/keyboard controls, comparison switching, and reduced-motion flow.
5. Added a 950 MiB preferred Pages dist warning gate while preserving the 1 GiB hard cap.

Core files: `landing/index.html`, `landing/app.js`, `landing/styles.css`, `tools/build_pages_dist.py`.

Test files: `tests/landing_showcase_view_behavior.test.mjs`, `tests/test_pages_dist_startup_shell.py`.

Generated dist files: `dist/index.html`, `dist/app.js`, `dist/styles.css`, `dist/pages-dist-manifest.json`.

Documentation files: `docs/active/_worktree_registry.md`, `docs/active/landing-product-story-phase4a/plan.md`, `docs/active/landing-product-story-phase4a/context.md`, `docs/active/landing-product-story-phase4a/task.md`.

Temporary files: `.runtime/tests/phase4a-landing-story/*.log` and `*.pid`, ignored runtime evidence only.

Diff summary: landing source/dist story section and product story controller; story CSS source/dist; Pages manifest size gate fields; landing Node tests; Pages startup-shell tests; Phase 4A docs and registry row.

Commit status: not committed yet. Reason: final staging, `verify:dist-drift`, and push/integration gates are still pending.

Base status: worktree base is `origin/main@13457c54`; parent checkout is dirty and behind remote main, so integration should use this isolated worktree or a clean integration worktree.

Potential conflicts: yellow with landing/page-dist/registry work because this branch touches `landing/*`, `dist/*`, `tools/build_pages_dist.py`, landing tests, startup-shell tests, and `_worktree_registry.md`; green for editor runtime, renderer runtime, scenario manifests, data schema, and backend code.

Validation passed:
- `node --check landing/app.js`
- `py -3 -m py_compile tools\build_pages_dist.py tests\test_pages_dist_startup_shell.py`
- `npm run verify:pages-dist` after final CSS change: builder passed, Python 41/41, landing Node 13/13, dist total `926.93 MiB`
- `npm run test:node:landing-showcase-view`: 13/13
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: 41/41
- Targeted CSS title-size guard: 2/2
- `git diff --check`: passed with CRLF warnings only

Review status: architecture review CLEAR; code review HIGH manifest finding resolved after final builder; remaining docs checklist finding addressed here.

Recommendation: rebase over latest `origin/main` if remote advanced, then merge/push this branch. Use a clean integration lane because the parent checkout has unrelated WIP.
