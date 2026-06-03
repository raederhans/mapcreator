# HGO Review Fix Context

## 2026-06-03

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-review-fix`
- Branch: `codex/hgo-review-fix`
- Base: latest `origin/main` at `c199b180`.
- Main checkout has unrelated dirty files and remains untouched.
- Loaded `ultrawork`, `lessons learned.md`, and `data/AGENTS.md`.
- Live tests/builds are owned by the main thread.
- Read-only review found Pages dist copied the full HGO PNG manifest while publishing only small/medium PNG tiers.
- Inspector detail flag preview requested medium but the shared selector preferred resolver `preferredBaseFlag`, so detail often showed the small tier.
- Data contract verification found byte-exact runtime registry hashes drifted under Windows checkout; governed JSON outputs now have LF attributes and refreshed hashes.
- Reviewer found `hgo_flags_index` was still exposed as a runtime key while Pages excluded that source index. The runtime registry now keeps only the HGO assets the inspector loads; source index remains available through manifest/catalog governance.
- Added Pages dist coverage that checks every emitted HGO PNG path exists and is listed in `dist/pages-dist-manifest.json`.

## Verification

- `npm run test:node:hgo-identity-resolver`: passed, 7 tests.
- `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract -q`: passed, 17 tests.
- `node --check js/core/hgo_identity_resolver.js; node --check js/ui/sidebar.js; node --check js/ui/sidebar/country_inspector_controller.js; python -m py_compile tools/build_pages_dist.py`: passed.
- `npm run verify:pages-dist`: passed, 14 tests, total dist size 992.44 MiB.
- `python tools/check_source_ledger.py`: passed with optional local source warnings.
- `python tools/data_health.py`: passed with report-only large file warnings.
- `git diff --check`: passed with Windows line-ending conversion warnings only.

## Target

Review HGO-related changes and fix confirmed defects without changing scenario/runtime ownership behavior.
