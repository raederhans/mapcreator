# HGO Scenario Platformization Task Board

## Todo

- [ ] Merge, push, and clean worktree.

## Done

- [x] Created isolated worktree.
- [x] Loaded user plan and project rules.
- [x] Created Ralph context snapshot and docs/active task folder.
- [x] Added Phase 0 projection matrix coverage and diagnostics.
- [x] Added hgoPreview render pass owner.
- [x] Wired hgoPreview pass into renderer state/signature/pipeline.
- [x] Removed direct main-canvas HGO raster overwrite path from draw composition.
- [x] Added/updated render boundary tests.
- [x] Ran Phase 1 targeted HGO preview/render checks.
- [x] Added HGO vectorizer/compiler/tool.
- [x] Generated data/scenarios/hgo_1936.
- [x] Registered hgo_1936 scenario and scripts.
- [x] Added HGO scenario strict/build tests.
- [x] Preserved A-Z0-9 country aliases and tested digit-prefixed owner tags.
- [x] Verified HGO editing identity flow.
- [x] Added scene-mode BMP isolation test.
- [x] Ran final review and fixed findings: id fallback, retired controller output, custom output registry updates, and capital hints snapshot tracking.
- [x] Rebuilt HGO scenario and Pages dist after review fixes.
- [x] Ran final verification suite with scoped pass evidence and perf control comparison.

## Known Risks

- HGO vector generation may create large topology. Builder tests must check size and feature counts before registration is trusted.
- Updating data/scenarios and dist may touch large generated assets. The diff must stay explainable.
- Existing main checkout has unrelated dirty files; final merge may need a clean integration path.
- `npm run perf:gate` remains red for `hoi4_1939.totalStartupMs` in both this branch and a clean `origin/main` control worktree, with no perf contract mismatches.
