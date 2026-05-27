# Full Codebase Maintenance Audit Plan

## Acceptance Criteria

- Map the repo into major ownership areas and identify where local fixes have created whole-project friction.
- Inspect agent-maintenance infrastructure: docs, skills, scripts, named test entries, diagnostics, and targeted bug-finding paths.
- Run a security-focused static review and dependency/configuration review.
- Fix only evidence-backed issues with narrow, reviewable patches.
- Preserve existing functionality, performance-sensitive paths, and visual behavior unless a verified fix improves them.
- Verify with targeted commands first, then broader checks only when touched contracts require them.

## Phase Checklist

- [x] Phase 0: Establish worktree, docs, Ultragoal state, and subagent lanes.
- [x] Phase 1: Build current architecture map from code, tests, scripts, docs, and recent project memory.
- [x] Phase 2: Run external best-practice research gates for browser/runtime architecture, security, and test/tooling maintenance.
- [x] Phase 3: Review agent-maintenance infrastructure and identify missing named checks, orphan tests, brittle docs, or poor diagnostic paths.
- [x] Phase 4: Review major code areas for coupling, duplication, hidden fallback layers, and over-complex implementations.
- [x] Phase 5: Apply focused fixes with tests or contract checks.
- [x] Phase 6: Run targeted verification, final security/code review, and first-principles bug check.
- [x] Phase 7: Update lessons learned if there is a major new lesson, archive docs, merge to main, commit, push, and clean the worktree.

## Current Execution Notes

- Shared files remain main-thread owned.
- Live tests and browser inspection remain main-thread owned.
- Subagents should return file paths, findings, recommended verification, and confidence.
- Final implementation stayed narrow: test route truth source, E2E manifest drift, parent-border owner boundary, unsafe DOM construction, runtime output boundaries, dev-server metadata, browser smoke shell hardening, and tracked root garbage cleanup.
- Browser smoke for `tests/e2e/strategic_overlay_sidebar_entry_smoke.spec.js` is recorded as a verification-channel gap: the first trace reached final assertions before Playwright total timeout, later reruns hung in the Playwright CLI startup layer with empty stdout/stderr.
