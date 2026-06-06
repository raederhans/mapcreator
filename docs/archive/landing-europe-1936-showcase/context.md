# Landing Europe 1936 Showcase Context

## 2026-06-06
- User asked to execute the earlier Europe-focused showcase plan until completion.
- Worktree created at `C:\Users\raede\Desktop\dev\mapcreator-landing-europe-1936-showcase`.
- Branch: `codex/landing-europe-1936-showcase`.
- Main checkout is at `3c512e2d`; only unrelated `.omx/metrics.json` is dirty there.
- Required skills loaded: `frontend-design`, `ultrawork`, and Ralph execution guidance.
- `lessons learned.md` highlights source/dist parity, real data contracts, Pages dist verification, and keeping generated/public artifacts synchronized.
- Sidecar data exploration agent: `019e9dea-100d-7d91-9c97-61b6dacd7763`.
- Sidecar landing/testing exploration agent: `019e9dea-5731-7c01-850c-72dd6c82e13d`.

## Owner Notes
- Main agent owns `npm run verify:pages-dist` and any server/browser checks.
- Sidecars must stay read-only and must not monitor live processes.

## Completion Notes
- Data chain selected: `hoi4_1936/manifest.json` for scenario topology, owners, countries, and capital hints; `global_rail/catalog.json` for Europe rail preview shards.
- Generator added: `tools/build_landing_europe_1936_showcase.py`.
- Generated assets: `landing/assets/europe-1936-showcase.svg` and `landing/assets/europe-1936-showcase.json`.
- Homepage `#showcase` now has four fixed-height layer tabs: political, rail, cities, scenario.
- `dist` refreshed by `npm run verify:pages-dist`.
- Verification passed:
  - `node --check landing/app.js`
  - targeted `tests.test_pages_dist_startup_shell` checks
  - `npm run verify:pages-dist` with 27 tests passing
- Review note: invalid Europe polygon geometry appeared during clipping; generator repairs geometry with `make_valid` before intersection.
