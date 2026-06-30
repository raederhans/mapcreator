# Phase 6B Sample Guide Export Plan

## Classification
Complex. This changes user-visible Guide UI, sample runtime state interpretation, i18n, Node tests, Playwright smoke coverage, release docs, and generated Pages dist.

## Acceptance Criteria
- Opening `/app/?sample=tno-1962-atlantropa-briefing&view=guide` shows sample-specific Guide content.
- The Guide explains the current sample and gives a clear next step.
- The Guide can open export workbench from the sample card.
- Bad sample links fail visibly and non-fatally.
- Normal Guide behavior without a sample is unchanged.
- Release smoke covers the sample-aware Guide card.
- Pages dist remains below the preferred 950 MiB target and 1 GiB hard cap.

## Execution Plan
- [x] Map Guide controller, HTML, CSS, toolbar wiring, and sample banner helper reuse points.
- [x] Add a pure sample guide context helper for success and error states.
- [x] Add compact Guide card UI near the top of the quick/start section.
- [x] Wire Guide actions for open export and original JSON download.
- [x] Add English and Simplified Chinese strings.
- [x] Extend Node and Playwright coverage.
- [x] Update release docs.
- [x] Regenerate dist and run required validation.
- [x] Run final review / first-principles bug check before closeout.

## Validation Plan
- `npm run test:node:sample-project-contracts`
- Focused Guide/sample Playwright tests
- `npm run test:node:landing-showcase-view`
- `npm run verify:pages-dist`
- Local release smoke when available
- `npm run verify:dist-drift`
- `git diff --check`

## Closeout Notes
- The first local release-gate attempt pointed at the dev server root and correctly saw local HGO preview state. The accepted release-gate target is the generated public mirror under `/dist/`.
- P43 is active in a sibling worktree and overlaps Phase 6B only through `package.json` and `docs/active/_worktree_registry.md`; future integration should reconcile script/registry edits there.

## Live Process Ownership
The main agent owns all live commands for this phase. Subagents may inspect files and propose test/review findings, but they must not start, poll, or interpret live test/build/dev-server processes.
