# HGO Runtime Mode Context

## 2026-06-06

- Root cause confirmed: HGO preview draws to `runtimeState.colorCanvas`, while normal `drawCanvas()` owns the same canvas and overwrites it on pan/zoom/render.
- Root cause confirmed: main click handling goes through `dispatchMapClick -> handleClick -> getHitFromEvent`, which reads app projection/spatial/hitCanvas data.
- HGO raster inspection exists in `hgo_runtime_preview.js`, but the main map click chain does not call it.
- Current working tree already contains dirty appearance/transport/border edits in shared files, so HGO changes must be tightly scoped and serial.
- Main agent owns tests/builds. Subagents are read-only review/evidence lanes only.
- Implemented renderer runtime mode wiring: `drawCanvas()` repaints HGO after normal app rendering; HGO hover/click inspect raster pixels before the app hit pipeline.
- Kept app selection boundaries explicit: HGO hit ids use `targetType: "hgo"` and preserve owner/controller data inside `hgoRuntime`, without treating HGO tags as app country codes.
- Pages dist verification exposed Windows instability while deleting/scanning the large HGO flag tree; `tools/build_pages_dist.py` now retries LF writes, reset deletion, and manifest scans for files that vanish during enumeration.
- Verification passed: `npm run test:node:hgo-runtime-preview`, `python -m unittest tests.test_runtime_hooks_boundary_contract -q`, JS syntax checks for source/dist HGO touchpoints, `npm run verify:pages-dist`, and `git diff --check`.
- Review result: main-thread first-principles review fixed the HGO hit boundary issue; a read-only native review subagent was opened for final diff review but timed out and was closed without changes.

## Review Follow-up

- Follow-up review found that `normalizeDevInteractionHit()` preserved the HGO hit id and target type but dropped the `hgoRuntime` payload. Fixed by normalizing and storing a compact HGO runtime payload on HGO dev hover/selection hits.
- Added runtime hook boundary assertions so future renderer edits keep `normalizeHgoRuntimeHitPayload()` and the HGO normalized-hit payload assignment.
- Added Pages dist builder unit coverage for clearing an existing output tree and retrying manifest scans after a file vanishes between enumeration and stat.
- Follow-up verification passed: `python -m unittest tests.test_runtime_hooks_boundary_contract -q`, `python -m unittest tests.test_pages_dist_startup_shell -q`, `npm run test:node:hgo-runtime-preview`, `npm run verify:pages-dist`, source/dist syntax checks, and `git diff --check`.
