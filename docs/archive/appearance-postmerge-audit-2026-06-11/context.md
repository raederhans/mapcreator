# Appearance Postmerge Audit Context - 2026-06-11

## Starting State

- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` is dirty and behind `origin/main`.
- Audit worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-postmerge-audit`.
- Audit branch: `codex/hgo-postmerge-audit`.
- HEAD: `440a6739 Make appearance controls preserve runtime intent`.
- Scope: Physical intensity-field pilot, owner panels, history scoping, save/load, renderer modulation, checked-in `dist/app`.

## Live Process Ownership

- Main thread owns all tests, builds, dev servers, and long-running commands.
- Subagents may run static inspection only.

## Findings Log

- Main-thread finding: `js/core/state/intensity_field_state.js` encoded neutral grid value `1` to byte `128` and decoded it as `128 / 127.5 = 1.0039216`, so an untouched saved field returned slightly non-neutral after import.
- Fix: centralized grid byte encode/decode helpers and made byte `128` decode to exact neutral `1`.
- Regression: `node --test tests/intensity_field.node.test.mjs` passes with 5 tests.
- Architect subagent status: WATCH. The current Physical legacy bridge is acceptable for this pilot; future Ocean expansion should avoid copying the same dual-write pattern and use a shared channel commit helper.
- Code-review subagent confirmed the same neutral-grid drift as HIGH.
- Code-review subagent also raised Pages/HGO generated-data risk: manifest listed generated scenario data while `dist/app/data` is ignored. `verify:pages-dist` generated `dist/app/data/scenarios/hgo_1936/manifest.json` and passed, so the delivery path is now proven by build output.
- HGO follow-up fix: excluded system owner `WTR` from playable/default bookmark tags and stopped emitting synthetic `HGO::<tag>` capital ids for countries without real city sources.

## Verification

- `node --test tests/intensity_field.node.test.mjs` passed, 5 tests.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs` passed, 33 tests.
- `python -m unittest tests.test_history_manager_strategic_overlay_contract -q` passed, 4 tests.
- `npm run test:node:physical-layer-contracts` passed, 2 tests.
- `npm run verify:pages-dist` passed: 34 Pages startup shell tests and 6 landing showcase tests.
- `npm run test:py:hgo-runtime-seed` passed, 27 tests.
- `npm run verify:scenario-contracts:hgo` passed.
- `npm run verify:state-write-allowlist` passed with 93 tracked files.
- `git diff --check` passed; Git printed Windows line-ending warnings only.

## Final Review Follow-up

- Final static review found `source_kind` missing from checked-in `dist/pages-dist-manifest.json` after the manifest schema changed.
- Fix: `write_dist_manifest()` now iterates until manifest text stabilizes and fails if it cannot stabilize within 20 passes.
- Fix: `data/scenarios/index.json` now has explicit `text eol=lf` in `.gitattributes`.
- Re-ran `npm run verify:pages-dist`: passed with 34 Pages startup shell tests and 6 landing showcase tests.
- Manifest check after rebuild: all 9360 `files[]` records include `source_kind`; `app/data/*` records are `generated_ignored`, other dist records are `dist`.
