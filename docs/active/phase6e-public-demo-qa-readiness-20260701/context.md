# Phase 6E Public Demo QA Readiness Context

## Starting Context

- User requested Phase 6E: Public Demo QA, Accessibility, Mobile, and Release Readiness Pass.
- Phase 6A-6D already shipped sample banner, sample-aware Guide, in-app sample switcher, and export recommendation proof.
- Current worktree was created from `origin/main@bb75c0cc5fc9c38ddb076674151a3f17135c5ec7`.
- Parent checkout is dirty and behind remote; it is preserved untouched.
- Another worktree exists for `codex/renderer-hit-canvas-scheduling-p47`.

## Skills Loaded

- `product-design:audit`
  - Local audit evidence destination: `.runtime/browser/phase6e-public-demo-qa/`.
  - Saved Product Design context preflight returned missing context, so repo evidence is the grounding source.
- `visual-ralph`
  - Used as visual QA discipline for screenshots and responsive checks. No new generated design reference is required because Phase 6E audits an existing product experience.
- `autopilot`
  - Requirements are sufficiently specified by the attachment. The deep-interview handoff is treated as complete because scope, non-goals, tasks, and acceptance criteria are explicit.

## Important Lessons Applied

- Clean worktree Playwright runs need a dependency entry point.
- New E2E specs must be registered in the layer manifest, test lists, timeout allowlist, and selector routing where relevant.
- Guide-triggered confirmation dialogs need stacking and clickability coverage.
- Sample-derived UI state must bind to the same sample id.
- Pages dist and release manifest changes should be regenerated from the final source tree.

## Current Outcome

- The Phase 6E UI fixes are narrow: semantics, focus return, mobile wrapping/layout, landing sample-card readability, and a user-visible startup deeplink scheduler path.
- Pages dist regeneration is stable at `972144112` bytes / `927.11 MiB` after rebasing onto `origin/main@58e3935b`.
- The branch passed fresh post-`58e3935b` validation and is ready for integration from `codex/phase6e-public-demo-qa-readiness`. Parent checkout WIP remains untouched.

## Live Process Owner

Main Codex thread owns all live browser/test/build/server processes. Current status: no Phase 6E live process running.

## Evidence Log

- Created isolated worktree from `origin/main@bb75c0cc5fc9c38ddb076674151a3f17135c5ec7`.
- Product Design user-context preflight: no saved context exists.
- Read project `AGENTS.md` and `lessons learned.md`.
- Read Phase 6E attachment and relevant Product Design, Visual Ralph, and Autopilot skills.
- Static subagents mapped sample Guide, Export, landing, i18n, release gate, and shared route risks. Architect status: WATCH, with existing-spec-first constraint.
- Extended plan with existing spec priority and shared hot-file avoidance for package/test routing.
- Implemented small readiness fixes: Guide sample choices role plus `aria-pressed`, Export context `role=status` plus wrapping, mobile Guide action layout, banner dismiss focus ring and copy padding, landing filter toolbar role, mobile landing sample cards/proof layout, and focus return from Guide-triggered Export/sample switching.
- Extended existing tests only: `sample_guide_deeplink.spec.js` now covers default Guide, focus/modal stacking/Escape, 375/768/desktop app checks, and Simplified Chinese TNO sample path; release gate now checks landing sample cards at 375px before the TNO path.
- Added post-ready scheduler support for user-visible tasks that may run through chunk infra backlog; startup sample deeplinks use it so `/app/?sample=...&view=guide` reaches `success` instead of staying `pending`.
- Release draft updated to manifest size `972144112` bytes / `927.11 MiB` and Phase 6E coverage notes.
- Validation passed:
  - changed-file `node --check`;
  - `npm run test:node:post-ready-scheduler` `11/11`;
  - `npm run test:node:sample-project-contracts` `17/17`;
  - `npm run test:e2e:sample-guide` `5/5`;
  - `py -3 tools\i18n_audit.py` with `ui_missing=0` and `ui_english_fallback=0`;
  - final post-P49 `npm run verify:pages-dist` with Pages startup shell `41/41`, landing showcase `18/18`, sample contracts `17/17`, and Pages size `972144112` bytes / `927.11 MiB`;
  - post-rebase `npm run test:e2e:sample-guide` `5/5`;
  - final local dist release gate at `http://127.0.0.1:8924/` `1/1` with sample status `success`, scenario `tno_1962`, and HGO disabled;
  - post-rebase `npm run verify:test-import-graph` with 51 specs;
  - post-rebase `npm run verify:test:e2e-layers` with 47 specs;
  - local dist release gate at `http://127.0.0.1:8920/` `1/1`;
  - pre-rebase `npm run verify:test-import-graph` with 51 specs;
  - pre-rebase `npm run verify:test:e2e-layers` with 47 specs.
- Dist mirror now includes the latest renderer changes through `dist/app/js/core/map_renderer.js` and the generated P47/P48/P49 owner mirrors.
- Post-b76 validation passed: changed-file `node --check`; `npm run test:node:post-ready-scheduler` `11/11`; `npm run test:node:sample-project-contracts` `17/17`; `npm run verify:dist-drift` with Pages size `927.11 MiB`; `npm run verify:test-import-graph` with 51 specs; `npm run verify:test:e2e-layers` with 47 specs; `npm run verify:architecture-boundaries`.
- Post-58e3935b validation passed after the renderer sweep rebase: changed-file `node --check`; `npm run test:node:post-ready-scheduler` `11/11`; `npm run test:node:sample-project-contracts` `17/17`; `py -3 tools\i18n_audit.py` with `ui_missing=0` and `ui_english_fallback=0`; `npm run verify:dist-drift` with Pages size `927.11 MiB`; `npm run verify:test-import-graph` with 51 specs; `npm run verify:test:e2e-layers` with 47 specs; `npm run verify:architecture-boundaries`; `git diff --check`; `npm run test:e2e:sample-guide` `5/5` from `.runtime\tests\phase6e-sample-guide-post-rebase-20260702.log`.
