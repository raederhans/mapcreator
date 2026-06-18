# Module Boundary Slimming Task

## Delivery Package: Phase 1

1. Changed pure translation/catalog ownership: moved runtime catalog and pure i18n/tooltip helpers into `js/core`.
2. Preserved UI behavior: `js/ui/i18n.js` still owns DOM refresh, language toggle, and runtime hook calls.
3. Removed direct core imports of UI i18n/toast from renderer, file manager, and scenario runtime modules.
4. Added toast hook wiring: `main.js` registers `showToastFn`, and core modules call it through runtime hooks.
5. Moved startup audit environment reads into bootstrap, then updated tools, tests, import graph, and Pages dist output.

## Changed Files

Core files:
- `js/core/i18n.js`
- `js/core/i18n_catalog.js`
- `js/core/map_renderer.js`
- `js/core/file_manager.js`
- `js/core/scenario_data_health.js`
- `js/core/scenario_manager.js`
- `js/core/scenario_recovery.js`
- `js/core/scenario_resources.js`
- `js/bootstrap/startup_bootstrap_support.js`
- `js/main.js`

UI compatibility files:
- `js/ui/i18n.js`
- `js/ui/i18n_catalog.js`

Tools and tests:
- `tools/i18n_audit.py`
- `tools/translate_manager.py`
- `tests/e2e/test-import-graph.json`
- targeted i18n/runtime/startup/sidebar/transport contract tests

Dist:
- `dist/app/js/...`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/module-boundary-slimming/*`
- `docs/active/_worktree_registry.md`

## Diff Summary

- Added new core i18n source files and matching dist files.
- Reduced UI i18n catalog to a compatibility re-export.
- Replaced core-to-UI imports with core imports plus runtime hook calls.
- Kept startup audit URL/config reading in bootstrap and passed only a boolean into core i18n.
- Regenerated checked-in import graph and Pages dist manifest.

## Commit State

- Current worktree is committed locally on `codex/module-boundary-slimming` after the final checkpoint.
- Recommended state: ready-for-integration; independent static review risk has been fixed.
- Ultragoal G002 is complete after the ordering assertion and architect CLEAR. Codex aggregate goal is complete. Ultragoal status reports `artifactComplete=true`; G001 remains `review_blocked` as audit-visible pre-fix review evidence.

## Base / Main Divergence

- Base commit: `origin/main@5494431c8fb721f7492be5ca84e7b5dab57abdf9`.
- Branch HEAD before Phase 1 commit: `5494431c8fb721f7492be5ca84e7b5dab57abdf9`.
- Current main and origin/main were equal when the worktree was created.

## Conflict Risk

- Red overlap with active parent WIP: `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, `dist/pages-dist-manifest.json`.
- Yellow overlap with future i18n/localization work: `js/ui/i18n.js`, `js/core/i18n.js`, catalog tools/tests.
- Green for unrelated landing-only or data-only work.

## Verification

- `node --check` on changed JS: passed.
- `node --check` on startup audit follow-up files: passed.
- Targeted contract suite after review fix: 104 tests passed.
- `npm run verify:test-import-graph`: passed.
- Equivalent Pages dist gate using `py -3`: builder passed, startup shell 37 tests passed, landing showcase 8 node tests passed.
- `git diff --check`: passed.
- ai-slop-cleaner changed-file scan: passed with no masking fallback or temporary workaround findings.
- Final code-reviewer lane: APPROVE with no issues.
- Final architect lane after ordering assertion: CLEAR. Integration sequencing against the parent TNO renderer WIP remains an integration-owner task.
- Final Ultragoal gate: ai-slop-cleaner passed, verification passed, code-reviewer APPROVE, architect CLEAR, G002 checkpoint complete.

## Remaining Risk

- Full `npm run verify:state-write-allowlist` has existing unrelated failures outside this phase.
- Full toolbar/transport module suite has unrelated existing text-contract failures; affected methods passed.
- Main integration should happen after comparing against the active parent renderer WIP.
- Integration must still account for red overlap with the parent TNO renderer WIP.

## Recommended Next Step

Integrate this Phase 1 branch after sequencing against the current TNO renderer WIP. Use rebase or cherry-pick only after comparing `map_renderer.js`, the matching dist file, and `dist/pages-dist-manifest.json`.
