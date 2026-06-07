# Landing Review Fix Context

## Snapshot

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-landing-review-fix`
- Branch: `codex/landing-review-fix`
- Base commit under review: `0f157036 Polish landing delivery surfaces to remove final drift`
- Parent checkout status before isolation: `main...origin/main`, dirty only at `.omx/metrics.json`.

## Constraints

- Main agent owns live tests/builds/browser processes.
- Subagents are static review lanes only.
- Pages dist is a checked-in delivery surface; source/dist sync is a hard gate.
- `tools/build_pages_dist.py` must stay compatible with deploy-minimal dependency limits.
- Display-only landing images are WebP; interactive Europe showcase remains SVG.

## Progress

- [x] Isolated worktree created.
- [x] Task docs created.
- [x] Static review lanes completed.
- [x] Fixed deploy-minimal pollution in `tests/test_pages_dist_startup_shell.py` by lazily importing landing asset builders and removing `npx`/SVGO execution from the deploy-minimal unittest surface.
- [x] Verification complete.
- [x] Archived.

## Final Review

- Independent code-review lane found one blocking deploy-minimal issue.
- Independent architect lane returned `WATCH` for the same dependency-boundary risk.
- Final read-only review found no blocking findings after the fix.
- First-principles check: the deploy publish path must copy checked-in delivery assets with stdlib-only dependencies; asset generator regression tests belong behind lazy imports so minimal CI can skip them cleanly.

## Verification Evidence

- `python -m py_compile tests\test_pages_dist_startup_shell.py tools\build_pages_dist.py tools\rasterize_landing_assets.py`
- `python -S -c "import tests.test_pages_dist_startup_shell; print('import-ok')"; python -S tools\build_pages_dist.py; python -S -m unittest tests.test_pages_dist_startup_shell -q` passed with `33 tests`, `skipped=4`.
- `npm.cmd run verify:pages-dist` passed with `33` Python tests and `2` Node landing showcase tests.
