# Phase 6B Sample Guide Export Context

## 2026-06-30
- Started from clean `main` at `fc59d527`.
- Active worktree list contains only `C:/Users/raede/Desktop/dev/mapcreator`.
- Ralph context snapshot: `.omx/context/phase6b-sample-guide-export-20260630T222123Z.md`.
- `ultrawork` reference file `references/agent-tiers.md` is missing from the installed skill directory; continuing with native Codex agent roles exposed by the current tool surface.
- Main agent owns live process execution for tests, dist build, release smoke, and final verification.
- Functional commit `81f2f30e` was rebased onto P43 `origin/main@473cd389`; the only conflict during docs restore was the registry text, resolved by preserving P43 truth and adding the Phase6B delivery package.

## Progress
- [x] Discovery
- [x] Implementation
- [x] Tests
- [x] Dist sync
- [x] Review
- [x] Functional commit
- [ ] Registry closeout / push

## Findings
- Guide controller is a narrow shell for section switching, open/close, button sync, and focus restore.
- The safest sample-aware Guide implementation shares sample URL and error resolution with the existing sample banner controller.
- `refreshSampleProjectBannerFn` is the existing sample state refresh hook, so it now refreshes both Project banner and Guide card.

## Verification
- `node --check js/ui/toolbar/sample_project_banner_controller.js; node --check js/ui/toolbar.js; node --check tests/e2e/sample_guide_deeplink.spec.js; node --check tests/sample_project_contracts.test.mjs; node --check tests/e2e/release/pages_public_release_gate.spec.js` passed.
- `npm run test:node:sample-project-contracts` passed, 11/11.
- `py -3 tools/i18n_audit.py` passed with `ui_missing=0`, `ui_english_fallback=0`.
- `npm run test:e2e:sample-guide` passed, 2/2.
- `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8810 npm run test:e2e:pages-public-release-gate` failed because the URL pointed to the dev server root, where local HGO preview options are expected. The release gate should target the public Pages mirror under `/dist/` after dist regeneration.
- `npm run verify:pages-dist` passed; generated size was `927.04 MiB`, under the preferred `950 MiB` target and `1 GiB` hard cap.
- `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8810/dist/ npm run test:e2e:pages-public-release-gate` passed, 1/1, against the generated public mirror.
- `npm run verify:architecture-boundaries` passed.
- `git diff --check` passed with Windows LF-to-CRLF warnings only.
- `npm run verify:test-import-graph` first reported a stale graph after the new E2E spec; `node tools/build_test_import_graph.mjs` updated it to 51 specs, and the second `npm run verify:test-import-graph` passed.

## First-Principles Review
- State source remains `runtimeState.sampleProjectDeeplink`; Guide UI derives from the same sample state as the Project banner.
- Success path exposes only existing export and original JSON actions.
- Error path shows a visible nonfatal message and keeps the default Guide path reachable.
- The sibling P43 worktree overlaps this phase in `package.json` and the registry only; code paths are otherwise separate.
- Final code-reviewer returned CLEAR with no blocking bug, security issue, regression risk, or over-complexity finding.
