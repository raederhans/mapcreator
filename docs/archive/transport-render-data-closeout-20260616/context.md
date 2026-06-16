# Transport Render/Data Closeout Context

## 2026-06-16 Start

- The automation audited a recent, functionally related commit cluster on `refactor/transport-render-data-closeout`.
- The parent checkout `C:\Users\raede\Desktop\dev\mapcreator` was dirty with unrelated localization, lessons, and dist mirror WIP, so execution stayed in `C:\Users\raede\.codex\worktrees\mapcreator-transport-render-data-closeout`.
- Live process owner: main Codex agent.
- Subagents: static audit/review only; no shared live tests, dev server, or browser process ownership.
- Base commit: `f4063d31165c6f9ae179b690ebded394c10366ff`.

## Audit Findings

- The first dist drift guard covered only part of tracked Pages output. It now covers root Pages files, root assets, app shell files, app JS/CSS/vendor trees, and the Pages manifest.
- The new road/rail runtime behavior tests needed a named package entry. They are now covered by `test:node:transport-workbench-preview-lifecycle-owner`.
- The JSON Schema migration initially allowed whitespace-only strings. Required string fields now use a reusable non-blank schema and a targeted regression test.

## WS3 Findings

- `python` was missing on Codex App PowerShell PATH, while `py -3` and the bundled Codex Python both worked.
- `verify:dist-drift` was validated after prepending the bundled Python path for npm script compatibility.
- A focused unit test now compares `git ls-files dist` against the pathspecs in both `package.json` and `.github/workflows/verify-shared.yml`.

## WS2 Findings

- `jsonschema` was already present in requirements files; no dependency edit was needed.
- Validator structural checks now run through Draft 2020-12 `PROFILE_SCHEMA`.
- Security and relationship checks remain explicit Python code: output containment, route URL locality and port parsing, safe ids, duplicate ids, route mode coverage, page references, mode subsets, port ordering, and quick/full budget ordering.

## WS1 Findings

- Existing golden coverage already verified China OSM-GPKG road, rail, industrial, and logistics pack byte stability.
- `FamilyOutput` keeps output-specific rules in the registry: per-output limits, dedup keys, scope strategy, preview strategy, and source layers.
- Thin compatibility wrappers remain for existing tests and scripts that import specific pack builders.
- Python-JS geometry-kind contract coverage now checks OSM-GPKG family outputs against `js/core/transport_capability_registry.js`.

## Final Verification Snapshot

- `py -3 -m unittest tests.test_playwright_app_ready_gate_contract -q`: passed.
- `py -3 tools/browser_smoke_profile_contract.py ops/browser-mcp/inspection-profile.toml`: passed.
- `py -3 -m unittest tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_pages_dist_drift_guard_covers_tracked_dist_outputs -q`: passed.
- `npm run -s test:node:transport-workbench-preview-lifecycle-owner`: passed.
- Full targeted gates were rerun before final commit and are recorded in `task.md`.

## First-Principles Review

- The simplest stable repair is a single source of truth per contract: dist pathspecs are tested against tracked files, smoke profile required strings share one schema helper, and OSM-GPKG output rules live in registry data.
- No new fallback layer was added. Each fix makes an invalid state fail earlier.
- Browser inspection was not used because these changes are contract, builder, and generated-dist validation work that can be proven through scripts and tests.
