# P7 Public Demo Release Plan

## Classification

- Task grade: `integration` / `complex`.
- Goal: freeze, verify, document, publish, and post-verify the v0.1 public demo.
- Live process owner: main Codex thread owns every build, Playwright run, deploy check, and GitHub release action.
- Subagent scope: static inspection and review only.

## First-Principles Scope

The public demo release is a packaging and verification task. The product behavior shipped by Phase 6A-6E is the input. P7 should record the exact release truth, prove the checked-in Pages package is below size gates, publish the already-built demo, and verify the deployed URL.

Allowed edits:

- release docs and release notes;
- README wording only when stale;
- registry and active release closeout docs;
- small blocker fixes for stale links, stale size numbers, missing i18n, dist drift, or release smoke failure.

Out of scope:

- new samples or runtime/editor features;
- renderer owner work;
- HGO public promotion;
- backend/cloud dependency work;
- large media assets;
- export auto-download smoke behavior.

## Execution Plan

1. Confirm Phase 6E is integrated into `origin/main`.
2. Create the P7 release worktree from the Phase 6E-integrated baseline.
3. Finalize release docs and GitHub release notes without changing runtime behavior.
4. Run local release gates:
   - `npm run verify:pages-dist`
   - `npm run verify:dist-drift`
   - `npm run test:e2e:sample-guide`
   - local `/dist/` release gate when available
   - `py -3 tools/i18n_audit.py`
   - `npm run verify:test-import-graph`
   - `git diff --check`
5. Review P7 changes with independent code-review and architecture lanes.
6. Commit, push to `origin/main`, wait for GitHub Pages deploy, and verify deployed release smoke.
7. Create `v0.1-public-demo` tag and GitHub release draft/pre-release.
8. Record deployed smoke, tag, Pages size, and follow-ups in the registry and active docs.

## Release Baseline

- Phase 6E integrated baseline at start of P7: `bcc00b62a1beac38d3a0d7978ddf282897f97273`.
- Initial Pages manifest size: `972144323` bytes / `927.11 MiB`.
- Size gate: `within_limit`; warning gate: `within_warning`.
