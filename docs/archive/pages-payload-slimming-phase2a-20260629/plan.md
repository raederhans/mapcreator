# Phase 2A Pages Payload Slimming Plan

Base: `origin/main@d331daae879af0a70312c0f82f9c1a9bfb0e710d`
Worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase2a-pages-slimming`
Branch: `codex/phase2a-pages-payload-slimming`

## Success Criteria

- [x] Pages build succeeds under the 1 GiB hard cap.
- [x] `dist/pages-dist-manifest.json` reports `size_gate.status == "within_limit"`.
- [x] Public scenario policy remains five public baselines plus HGO 1936 developer/local preview.
- [x] Published Pages metadata and catalogs reference only shipped files.
- [x] Source data remains intact.
- [x] Verification commands pass or have explicit evidence-backed exceptions.

## Work Plan

- [x] Inspect manifest, copy policy, and runtime references for the largest Pages files.
- [x] Choose explicit Pages prune/allowlist rules for local-only or developer-preview payloads.
- [x] Add a compact Pages payload summary if it improves reviewability.
- [x] Patch build policy and affected metadata/tests.
- [x] Rebuild `dist/` and validate size gate.
- [x] Run targeted Node/Python/static verification.
- [x] Run independent code-review lane.
- [x] Complete independent architect verification.
- [x] Commit, push, merge into `main`, and update registry after verification.

## Live Process Ownership

Main agent owns all build/test/dev-server/browser live processes. Subagents may inspect source files and completed outputs only.

## Current Evidence

- `npm run verify:pages-dist`: passed; total `972533254` bytes / `927.48 MiB`; `size_gate.status == "within_limit"`.
- `npm run verify:toolbar-split-boundary`: passed, 53 tests.
- `node --test tests/hgo_raster_renderer.node.test.mjs tests/hgo_runtime_preview.node.test.mjs tests/hgo_runtime_preview_toolbar.node.test.mjs`: passed, 41 tests; Node emitted existing module-type warnings.
- `py -3 -m unittest tests.test_scenario_contracts -q`: passed, 41 tests; expected risky fixture diagnostic printed with exit code 0.
- `py -3 -m unittest tests.test_data_catalog_contract -q`: passed, 18 tests.
- `py -3 -m unittest tests.test_transport_manifest_contracts -q`: passed, 18 tests.
- `npm run verify:architecture-boundaries`: passed.
- `npm run verify:test-import-graph`: passed, 49 specs.
- Architect review: APPROVED after replacing the positional alias cap with semantic stable-key priority.
- `git diff --check`: passed with CRLF normalization warnings only.
