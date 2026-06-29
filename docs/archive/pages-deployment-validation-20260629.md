# Pages Deployment Validation - 2026-06-29

## Result

- Release gate status: pass.
- Validated deploy commit: `e58a57252a55de21097025ad579fc716bdf9e64f`.
- Pages URL: `https://raederhans.github.io/scenario-forge/`.
- Deploy workflow run: `https://github.com/raederhans/scenario-forge/actions/runs/28391632106`, conclusion `success`.
- Dist manifest: `total_bytes=971929677`, `max_allowed_bytes=1073741824`, `size_gate.status=within_limit`, `over_by_bytes=0`.

## Size Gate Evidence

- `npm run verify:pages-dist`: pass.
- Pages dist builder output: `926.90 MiB`.
- `dist/pages-dist-manifest.json` confirms the payload is under the 1 GiB GitHub Pages limit.
- The manifest moved from the older Phase 2A/P32 byte totals because this pass normalized generated `.geojson` text output to LF and made manifest scanning deterministic by repo-relative POSIX path order.

## Workflow Evidence

- Previous run `28390356840` failed at the tracked dist drift gate after deploy-minimal dependency guardrails were fixed; root cause was generated GeoJSON line-ending drift.
- Previous run `28391060914` failed at the same gate; root cause was Windows/Linux manifest ordering drift for mixed-case path entries.
- Run `28391632106` succeeded for commit `e58a57252a55de21097025ad579fc716bdf9e64f`.
- Successful jobs in run `28391632106`:
  - `verify` job `84119921980`: build Pages dist, tracked dist drift gate, startup shell test, and deploy dist artifact upload all passed.
  - `build` job `84120450551`: downloaded the verified dist artifact, validated payload, set up Pages, and uploaded the Pages artifact.
  - `deploy` job `84120581614`: deployed to GitHub Pages and completed at `2026-06-29T17:52:47Z`.
- Repository Pages settings reported `build_type=workflow`, `public=true`, `html_url=https://raederhans.github.io/scenario-forge/`, `source.branch=main`, and `source.path=/`.

## Public URL Smoke

- Command: `SCENARIO_FORGE_PAGES_URL=https://raederhans.github.io/scenario-forge/ npm run test:e2e:pages-public-release-gate`.
- Result: pass, `1/1` test in about `27.3s`.
- Covered release-gate checks:
  - Root landing page loads.
  - `/app/?view=guide` loads and the guide view opens.
  - TNO default scenario boots to interactive shell state with scenario id `tno_1962`.
  - Scenario selector exposes public baselines only: blank, HOI4 1936, HOI4 1939, modern world, and TNO 1962.
  - HGO developer preview is not exposed as a public option and HGO runtime assets are absent from the public shell.
  - Export workbench opens from the deployed public app.
- Smoke notes:
  - The script ignores the expected anonymous backend auth probe.
  - An initial smoke attempt observed an aborted landing image request while the test navigated away; direct HTTP verification for `assets/work-atlas-japan-corridor.webp` returned `200 OK` with `content-length=50374`. The smoke now waits for landing network idle before moving to the app URL.
- Skipped browser checks: the deploy workflow used the existing deploy-minimal profile, so full-profile browser sweeps were skipped by workflow conditions. The focused public URL smoke above is the Phase 2B release gate for the public demo surface.

## Validation Commands

- `npm run verify:pages-dist`: pass.
- `python -m unittest tests.test_pages_dist_startup_shell -q`: pass through `verify:pages-dist`, `41` tests.
- `npm run test:node:landing-showcase-view`: pass through `verify:pages-dist`, `9` tests.
- `npm run verify:dist-drift`: pass.
- `python -m unittest tests.test_pages_dist_startup_shell_heavy -q`: pass, `2` tests.
- `node --test tests/export_workbench_state_behavior.test.mjs`: pass, `10` tests.
- `python -m unittest tests.test_toolbar_split_boundary_contract -q`: pass, `53` tests.
- `node --check js/ui/toolbar.js`: pass.
- `node --check tests/e2e/release/pages_public_release_gate.spec.js`: pass.
- `python tools/check_min_ci_requirements.py`: pass, `heavy-tests=13`.
- `npm run verify:test:e2e-layers`: pass, `46` layer specs checked.
- Local generated dist smoke against `http://127.0.0.1:8766/`: pass.
- Deployed public URL smoke against `https://raederhans.github.io/scenario-forge/`: pass.
- `git diff --check`: pass, with Windows checkout LF-to-CRLF warnings only.

## Phase 2A Contract Check

- HGO runtime payload remains excluded from Pages.
- Japan industrial local preview GeoJSON remains excluded from Pages.
- Full `city_aliases.json` remains excluded from Pages.
- Public scenario policy remains five public baselines plus HGO developer/local preview.

## Remaining Blockers

- None for the Phase 2B Pages release gate.

## Recovery Pointers

- Implementation commits: `46f25dc18fad08b6b9b48d9c94c69d421e0f960d`, `6c39e16967359d363f12df24e5c7888b1fb5ae7d`, `e58a57252a55de21097025ad579fc716bdf9e64f`.
- Temporary integration worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase2b-pages-release-gate`.
