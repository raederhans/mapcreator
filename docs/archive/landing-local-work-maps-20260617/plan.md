# Landing Local Work Maps Plan

Task: replace the three homepage work-card placeholder maps with local, detailed, scenario/resource-backed map assets.

Acceptance criteria:
- Generate `work-alt-history-med`, `work-scenario-switch-europe`, and `work-atlas-japan-corridor` as SVG, WebP, and JSON metadata under `landing/assets` and synced `dist/assets`.
- Update the three bento work-card image references and alt text in `landing/index.html` and packaged `dist/index.html`.
- Keep editor runtime scenario data unchanged.
- Run the asset build, Pages dist verification, static reference checks, and a lightweight browser visual check of the bento section.

Execution checklist:
- [x] Create Ralph/context snapshot.
- [x] Add task docs.
- [x] Implement landing work-map asset builder.
- [x] Add raster targets and package sync.
- [x] Update landing/dist image references and copy.
- [x] Run focused asset generation.
- [x] Run Pages dist verification chain with `py -3` because the local `python` command is unavailable in npm/cmd.
- [x] Run static reference checks.
- [x] Run browser visual check.
- [x] Run review bug pass and fix findings.
- [x] Isolate the landing changes into clean branch `codex/landing-work-maps-integration`.
- [x] Update worktree registry delivery package.

Completion note:
- Implementation was integrated from clean branch `codex/landing-work-maps-integration`, fast-forward merged into `main` at `a48eec68`, and pushed to `origin/main`; the mixed parent checkout remains a recovery/source tree for unrelated renderer work.
