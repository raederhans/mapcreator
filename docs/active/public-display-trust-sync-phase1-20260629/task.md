# Public Display Trust Sync Phase 1 Task

## Scope

Implement Phase 1: public display trust sync and deploy health hardening.

## Acceptance Checklist

- [x] `dist/pages-dist-manifest.json` is valid JSON and non-empty.
- [x] `tools/build_pages_dist.py` succeeds or fails transparently with size/data evidence.
- [x] Public stats are tied to source data or tested generated values.
- [x] README, Chinese README, landing source, and dist agree on scenario count and HGO maturity.
- [x] Transport copy separates ready/main-map paths from preview/workbench paths.
- [x] Manifest validity regression prevents empty manifest recurrence.
- [x] Public stats regression prevents silent drift.
- [x] Direct `/app/?view=guide` behavior is covered.
- [x] Final report includes changed files, commands, results, dist size, and known limitations.

## Delivery Package

1. What changed:
   - Public docs and landing copy now state 5 public baselines and HGO 1936 as a developer/local preview.
   - `data/scenarios/index.json` now exposes `public_baseline_ids` and `developer_preview_ids` as the public scenario maturity contract.
   - Landing stat cards now declare parseable source markers, and the Node landing test resolves those markers against source JSON for both source and checked-in dist.
   - Pages dist generation now uses a 1 GiB hard cap and writes `size_gate`, `largest_files`, and `top_level_directories` into the manifest before failing.
   - Direct `/app/?view=guide` behavior is covered by a focused Playwright test.

2. File groups:
   - Core/public source: `README.md`, `README.zh-CN.md`, `data/scenarios/index.json`, `landing/index.html`, `landing/app.js`, `tools/build_pages_dist.py`.
   - Tests: `tests/landing_showcase_view_behavior.test.mjs`, `tests/test_pages_dist_startup_shell.py`, `tests/e2e/ui_rework_support_transport_hardening.spec.js`.
   - Checked-in dist: `dist/index.html`, `dist/app.js`, `dist/pages-dist-manifest.json`.
   - Docs: `docs/active/_worktree_registry.md`, `docs/active/public-display-trust-sync-phase1-20260629/plan.md`, `docs/active/public-display-trust-sync-phase1-20260629/context.md`, and this task file.
   - Temporary files: none kept in source tree.

3. Diff summary:
   - Public copy and translations changed only scenario/transport maturity wording.
   - Landing stat test gained source-marker parsing and public/developer scenario maturity assertions.
   - Pages manifest contract gained schema/non-empty/size-gate/largest-file/top-directory assertions.
   - Pages builder gained 1 GiB cap metadata and transparent failure messaging.
   - Dist was rebuilt after source changes; manifest reports current over-limit state.

4. Commit status:
   - This delivery package is ready for one functional commit on branch `codex/phase1-public-trust-sync`.

5. Base divergence:
   - Worktree was created from `origin/main@c59bb7d7eb26799195f7d5dc9a1d5cc29ea3ff13`, rebased onto `origin/main@f0000344cb64175f18d07e3ab50339d5b0aba9a7`, and rebased again onto `origin/main@e0bd74b989b79184c0c25c14fdfbcf233238b559`.
   - Parent checkout is dirty with unrelated docs/archive WIP and remains untouched.

6. Potential conflicts:
   - Red: concurrent edits to `dist/pages-dist-manifest.json`, `tools/build_pages_dist.py`, or landing stat markup/tests.
   - Yellow: concurrent changes to scenario registry maturity semantics, README public product copy, or guide E2E support-surface tests.
   - Green: unrelated renderer extraction lanes and parent docs/archive cleanup WIP by path.

7. Verification run:
   - PASS: `npm run test:node:landing-showcase-view` -> 9 tests passed.
   - PASS: `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q` -> 39 tests passed.
   - PASS: focused Playwright direct guide URL test -> 1 test passed.
   - EXPECTED FAIL: `npm run python -- tools/build_pages_dist.py` -> 1101.80 MiB exceeds 1024.00 MiB by 77.80 MiB.
   - EXPECTED FAIL: `npm run verify:pages-dist` -> same 1 GiB size gate failure.
   - EXTRA CHECK FAIL: data catalog/manifest contracts fail on existing `locales.json: size/hash drift`; no locales or `data/manifest.json` files are changed by this branch.

8. Remaining risks:
   - Pages publish remains blocked until the runtime payload is pruned or reshaped below the 1 GiB cap.
   - Full Playwright suite and full repository test matrix were not run.
   - The existing `locales.json` manifest drift needs a separate data-manifest owner.

9. Recommended next step:
   - Merge this branch as Phase 1 health hardening after review, because it makes public truth testable and turns Pages overage into a clear deploy blocker.
   - Start Phase 2 on payload slimming, using `dist/pages-dist-manifest.json` largest files and directory totals as the first evidence source.

10. Integration stance:
   - Can integrate as a safety/contract branch.
   - Do not deploy Pages from the resulting tree until `size_gate.status` returns to `within_limit`.
