# P7 Public Demo Release Task Tracker

## Checklist

- [x] Fetch latest remote state.
- [x] Confirm Phase 6E is integrated into `origin/main`.
- [x] Create isolated P7 worktree from Phase 6E-integrated `origin/main`.
- [x] Read P7 attachment, project rules, and `lessons learned.md`.
- [x] Inspect release draft, README files, sample manifest, Pages manifest, package scripts, deploy workflow, and release smoke spec.
- [x] Create P7 active task docs.
- [x] Update worktree registry with P7 current truth.
- [x] Finalize release document.
- [x] Prepare GitHub release notes draft.
- [x] Run `npm run verify:pages-dist`.
- [x] Run `npm run verify:dist-drift`.
- [x] Run `npm run test:e2e:sample-guide`.
- [x] Run local `/dist/` public release gate.
- [x] Run `py -3 tools/i18n_audit.py`.
- [x] Run `npm run verify:test-import-graph`.
- [x] Run `git diff --check`.
- [x] Run independent code-review and architecture review.
- [ ] Commit with Lore protocol.
- [ ] Push release candidate to `origin/main`.
- [ ] Verify GitHub Pages deploy workflow and deployed release smoke.
- [ ] Create `v0.1-public-demo` tag.
- [ ] Create GitHub release draft/pre-release.
- [ ] Record post-release closeout and follow-ups.
- [ ] Clean integrated worktrees when safe.

## Acceptance Mapping

- Phase 6E integrated: yes, `origin/main@bcc00b62a1beac38d3a0d7978ddf282897f97273`.
- Release candidate baseline recorded: yes, runtime baseline is `bcc00b62a1beac38d3a0d7978ddf282897f97273`; release tag is `v0.1-public-demo`, and the final tag target commit will be recorded after release creation.
- Pages dist under gates: manifest reports `972144323` bytes / `927.11 MiB`, `within_limit`, `within_warning`.
- Docs match actual behavior: yes, after local release gates.
- GitHub release: pending deploy verification.

## Local Validation Results

- `npm run verify:pages-dist`: passed; Pages size `927.11 MiB`; startup shell `41/41`; landing showcase `18/18`; sample contracts `17/17`.
- `npm run verify:dist-drift`: passed with no dist drift.
- `py -3 tools\i18n_audit.py`: passed with `ui_missing=0`, `ui_english_fallback=0`.
- `npm run test:e2e:sample-guide`: passed `5/5`.
- `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8930/dist/ npm run test:e2e:pages-public-release-gate`: passed `1/1`; stdout recorded `activeScenarioId=tno_1962`, sample deeplink `success`, `hgoPreviewEnabled=false`, and `hasHgoRuntimeAssets=false`.
- `npm run verify:test-import-graph`: passed with 51 specs.
- `git diff --check`: passed.

## Risk Notes

- Git commit hashes cannot be self-recorded inside the same commit. The release tag target and deployed workflow result will be recorded in a post-release closeout commit.
- `landing/assets/sample-runs.json` keeps its content timestamp because P7 does not change sample content.
- Remote Pages smoke depends on GitHub Actions and Pages availability after the push to `main`.
- Independent review fixes are applied: registry SHA corrected, release facts centralized in `docs/releases/v0.1-public-demo.md`, and the completed Phase 6E active docs moved to `docs/archive/phase6e-public-demo-qa-readiness-20260701/`.
