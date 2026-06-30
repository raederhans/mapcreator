# Phase 5A Sample Projects Context

## 2026-06-30 Setup

- Worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase5a-sample-projects`
- Branch: `codex/phase5a-sample-projects`
- Original base: `main@865d58ac`
- Current base after safe rebase: `main@52c2d873`
- Phase4B precondition: satisfied. Phase4B gallery commit `36dbcb1a` and integration closeout `865d58ac` are pushed to `origin/main`.
- Parent checkout docs WIP is preserved in stash `preserve main docs WIP before phase4b integration 2026-06-30`.
- Live process owner: main Codex agent only.
- Subagents: static planner, architect, and critic lanes only until implementation is ready for final review.

## Initial Evidence

- Phase4B sample cards exist for TNO Atlantropa, HOI4 Europe comparison, and Japan Tokaido corridor.
- Public scenario index allows `blank_base`, `modern_world`, `hoi4_1936`, `hoi4_1939`, and `tno_1962`.
- `hgo_1936` is listed as a developer preview scenario and must not appear in public sample project downloads.
- Current project schema is built by `FileManager.buildProjectPayload()` with `schemaVersion: 22`.
- `tools/build_pages_dist.py` copies `landing/**` into the Pages root, so sample project downloads under `landing/assets/sample-projects/` will publish under `dist/assets/sample-projects/`.

## Working Notes

- Keep sample JSON files compact and human-readable.
- Prefer explicit manifest fields over deriving behavior from landing markup.
- Use contract tests to prevent URL drift and private scenario leakage.
- Keep landing UI wording direct: download the JSON, then import it through the app's project import flow.

## 2026-06-30 Implementation Notes

- Main advanced to `52c2d873` after Phase5A setup; Phase5A changes were saved with `git stash push -u`, the branch was rebased onto main, and the stash was restored cleanly.
- Added five compact project JSON files under `landing/assets/sample-projects/`, one per public scenario baseline.
- Added `landing/assets/sample-runs.json` with `project_schema_version: 22`, public scenario ids, HGO developer-preview exclusion, sample project entries, and featured run metadata.
- Landing sample-run cards now expose scenario ids, project URLs, direct JSON downloads, and a manifest link.
- Added `tests/sample_project_contracts.test.mjs` plus `npm run test:node:sample-project-contracts`; `npm run verify:pages-dist` now includes that contract.
- Extended landing and Pages dist tests to check sample manifest URLs, sample project links, i18n keys, CSS actions, and dist asset copies.

## 2026-06-30 Validation Notes

- Independent code review found a P1 gap: the landing page had visible downloads for only three featured cards while the manifest listed five sample projects.
- Fixed the gap by adding a compact five-item sample project download list, bilingual labels, CSS, landing behavior extraction, README entries for all five samples, and source/dist contract checks.
- `npm run verify:pages-dist` passed with `tools/build_pages_dist.py`, Python startup shell 41/41, landing showcase Node 18/18, and sample project contracts 3/3.
- Validation log: `.runtime/tests/phase5a/verify-pages-dist.log`; exit file reported `EXIT=0`.
- `lessons learned.md` already records Pages byte-exact JSON/LF manifest drift handling, so no new lesson entry was added.
- `npm run verify:dist-drift` passed after staging the regenerated Pages output.
- `git diff --check`, `git diff --cached --check`, `npm run verify:test-import-graph`, and `npm run verify:architecture-boundaries` passed.
- Follow-up code review returned APPROVE with the P1 public-download coverage gap closed.
- Follow-up architecture review returned CLEAR for Phase5A integration.
