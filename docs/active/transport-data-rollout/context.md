# Transport Data Rollout Context

## 2026-05-31

- Created isolated worktree: `C:\Users\raede\.codex\worktrees\transport-data-rollout`, branch `codex/transport-data-rollout`.
- Created Codex goal for full transport data rollout.
- Loaded `$ultragoal`, `$ultrawork`, and `$autoresearch`.
- `omx ultragoal create-goals --force` succeeded. `omx ultragoal complete-goals` hit a Windows `EPERM` rename error, so progress tracking continues through this active task log and the Codex goal.
- Existing source cache was copied from `C:\Users\raede\Desktop\dev\mapcreator\.runtime\source-cache\transport` into this worktree's `.runtime/source-cache/transport`.
- Current repository has existing real-source country packs for roads, rail, and airports only: `germany_road`, `uk_road`, `france_rail`, `usa_airport`, `china_airport`, `russia_airport`, `india_airport`.
- Current workbench runtime can already select active packs for `road`, `rail`, and `airport`. `port`, `energy_facilities`, `mineral_resources`, `industrial_zones`, and `logistics_hubs` currently resolve Japan manifests by family default.

## Subagent Findings

- Road sources: USA and France are strongest first. India can use OSM/Geofabrik geometry with MoRTH/NH official anchors. China and Russia require OSM/Geofabrik geometry with official policy or service pages as scope/label anchors.
- Airport sources: Germany BKG POI-Open is cleanest. France AIP AD 1.3 is strong but reuse terms need care. UK CAA gives strong registry/statistics but no clean bulk coordinate layer. Japan airport should stay preview-only unless a new country-scope pack is created.
- Rail sources: Germany and USA are strongest first. UK, India, Russia, and China need OSM/Geofabrik geometry plus official station/statistical anchors; China must split mainland/Taiwan logic.
- Port sources: UN/LOCODE is the best common key. France, Russia, USA, and India are clearer. Germany/UK need list-plus-coordinate merge. China official chart service has token/licensing constraints.
- Code map: minimum chain is source contract, source download/check, pack builder, manifest contract, runtime registry, resolver/UI runtime, catalog, dist, tests.

## Live Process Ownership

- Main thread owns all downloads, builders, tests, dev server, and browser/app verification.
- Subagents are static/research only unless explicitly reassigned.
