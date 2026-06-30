# Phase 5A Sample Projects Task

## Checklist

- [x] Confirm Phase4B gallery is merged and pushed to main.
- [x] Create isolated Phase5A worktree.
- [x] Read `lessons learned.md`.
- [x] Create Phase5A plan/context/task docs and registry row.
- [x] Complete static plan/architecture/critic review.
- [x] Inventory exact landing/schema/test/doc edit points.
- [x] Rebase Phase5A branch from `865d58ac` to current `main@52c2d873`.
- [x] Add sample project JSON files.
- [x] Add sample-runs manifest.
- [x] Wire landing download links and bilingual copy.
- [x] Add sample project contract tests and named script entry.
- [x] Update README, README.zh-CN, and release draft.
- [x] Regenerate Pages dist.
- [x] Run validation commands.
- [x] Run independent code/architecture review and fix the public-download coverage finding.
- [x] Run final drift/static checks after staging.
- [ ] Commit, push, merge to main, update registry, and clean worktree.

## Delivery Package Draft

Status: ready-for-integration.

1. What changed:
   - Added five public sample project JSON files and one sample-run manifest.
   - Added landing card download links, scenario/project metadata, and bilingual labels.
   - Added a full five-item sample project download list so every manifest sample has a visible landing link.
   - Added focused sample project contract tests and included them in `verify:pages-dist`.
   - Extended landing/Pages dist contracts for manifest URLs, project links, copied assets, and CSS.
   - Updated public README files and v0.1 draft release notes with sample project download guidance.

2. Changed files:
   - Core landing source: `landing/index.html`, `landing/app.js`, `landing/styles.css`.
   - Sample assets: `landing/assets/sample-runs.json`, `landing/assets/sample-projects/*.project.json`.
   - Tests: `tests/landing_showcase_view_behavior.test.mjs`, `tests/sample_project_contracts.test.mjs`, `tests/test_pages_dist_startup_shell.py`, `package.json`.
   - Docs: `README.md`, `README.zh-CN.md`, `docs/releases/v0.1-public-demo-draft.md`, this task folder, and registry.
   - Generated dist: `dist/index.html`, `dist/app.js`, `dist/styles.css`, `dist/assets/sample-runs.json`, `dist/assets/sample-projects/*.project.json`, `dist/pages-dist-manifest.json`.
   - Temporary files: `.runtime/**` only if validations need logs.

3. Diff summary:
   - Adds checked-in public sample project downloads and a manifest.
   - Keeps three featured run cards for visual gallery browsing.
   - Adds a separate five-project download list bound by tests to the manifest.
   - Extends source and dist contracts for landing markup, CSS, copied assets, and FileManager import compatibility.

4. Commit status:
   - No Phase5A functional commit yet; branch is staged for final drift/static checks.

5. Base and main divergence:
   - Original base commit: `main@865d58ac`.
   - Current base after rebase: `main@52c2d873`.
   - Current branch: `codex/phase5a-sample-projects`.
   - Parent main is clean and synced to `origin/main@52c2d873`.

6. Potential conflicts:
   - Yellow with future landing, README, release, test, package script, Pages dist, and registry work.
   - Green for renderer, backend, runtime scenario data, and HGO runtime code.

7. Validation:
   - `npm run verify:pages-dist` passed on 2026-06-30 with Pages builder, Python startup shell 41/41, landing showcase Node 18/18, and sample project contracts 3/3.
   - `npm run verify:dist-drift` passed after staging.
   - `npm run verify:test-import-graph`, `npm run verify:architecture-boundaries`, `git diff --check`, and `git diff --cached --check` passed.
   - Earlier targeted checks passed: `node --check` for changed JS tests and app code; `npm run python -- -m py_compile tests/test_pages_dist_startup_shell.py`.
   - Follow-up code-reviewer returned APPROVE; follow-up architect returned CLEAR.

8. Remaining risk:
   - Browser smoke was not run because this phase is static landing/download contract work and Node/Python contracts cover URLs, dist copies, and import compatibility.
   - Future sample additions must update manifest, visible landing list, README files, and contract tests together.

9. Recommended next step:
   - Run final static/drift checks, commit the branch, push it, merge to main, archive this task folder, and clean the worktree.

10. Integration readiness:
   - Ready for integration.
