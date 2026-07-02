# P7 Public Demo Release Context

## Starting Context

- User requested P7: v0.1 Public Demo Release Packaging.
- Phase 6E is integrated into `origin/main` at `bcc00b62a1beac38d3a0d7978ddf282897f97273`.
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` remains dirty and behind remote; it is preserved untouched.
- P7 worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p7-public-demo-release-20260702`.
- P7 branch: `codex/p7-public-demo-release-20260702`.

## Important Boundaries

- P7 is a release packaging task; no product feature work is planned.
- HGO 1936 remains developer/local preview and is excluded from public samples.
- The public sample set is exactly five baselines: Blank Map, Modern World, HOI4 1936, HOI4 1939, and TNO 1962.
- Runtime/build/test live processes are owned by the main Codex thread.

## Evidence Log

- `git worktree list` confirmed the new P7 worktree at `HEAD bcc00b62a1beac38d3a0d7978ddf282897f97273`.
- `git ls-remote` after Phase 6E integration confirmed both `refs/heads/main` and `refs/heads/codex/phase6e-public-demo-qa-readiness` point at `bcc00b62a1beac38d3a0d7978ddf282897f97273`.
- `dist/pages-dist-manifest.json` reports `total_bytes=972144323`, `size_gate.status=within_limit`, and `size_gate.warning_status=within_warning`.
- `landing/assets/sample-runs.json` lists five public samples and `developer_preview_exclusions: ["hgo_1936"]`.
- `.github/workflows/deploy.yml` validates the dist payload, deploys Pages, then runs `npm run test:e2e:pages-public-release-gate` against `steps.deployment.outputs.page_url`.
- Static code-mapper review found the release chain structurally complete and flagged the release draft byte count as stale by 211 bytes.
- Local release validation passed:
  - `npm run verify:pages-dist`: Pages size `927.11 MiB`, startup shell `41/41`, landing showcase `18/18`, sample contracts `17/17`;
  - `npm run verify:dist-drift`: no dist drift;
  - `py -3 tools\i18n_audit.py`: `ui_missing=0`, `ui_english_fallback=0`;
  - `npm run test:e2e:sample-guide`: `5/5`;
  - `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8930/dist/ npm run test:e2e:pages-public-release-gate`: `1/1`, `activeScenarioId=tno_1962`, sample deeplink `success`, HGO disabled and absent;
  - `npm run verify:test-import-graph`: 51 specs;
  - `git diff --check`: passed.
- Independent code-review found a bad full SHA in the registry; fixed to `dfd4cb975306dedc79f0aa7d7fd883dc33861c26`.
- Independent architecture review recommended a single current release facts source. `docs/releases/v0.1-public-demo.md` is now the canonical P7 facts document, draft/notes link back to it for exact validation truth, and completed Phase 6E active docs moved to `docs/archive/phase6e-public-demo-qa-readiness-20260701/`.

## Live Process Owner

Main Codex thread owns all P7 build/test/deploy/release commands. Current status: no P7 live process is running.

## Open Items

- Push the release packaging branch to `origin/main`.
- Wait for GitHub Pages deploy workflow and collect deployed release smoke result.
- Create `v0.1-public-demo` release tag and GitHub release draft/pre-release.
- Record post-release closeout and P8 follow-up notes.
