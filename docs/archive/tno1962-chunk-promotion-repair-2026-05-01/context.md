# tno1962 chunk-promotion repair context

## 2026-05-01 execution start
- Created dedicated worktree branch `ralph/tno1962-chunk-promotion-repair` from `main` to isolate implementation from unrelated dirty files in the primary checkout.
- Reused prior plan evidence: root cause is stale primary derived state between political chunk promotion and deferred infra.
- Initial implementation target is `refreshMapDataForScenarioChunkPromotion()` with supporting contract updates in existing test files.
- Implemented runtime fix in `map_renderer.js`: political chunk promotion now reuses `rebuildRuntimeDerivedState(...)` before first render; deferred infra gets a new `primaryDerivedStateReady` split.
- Tightened `chunk_runtime.js` feature-id refresh set to union supplied ids with previous/next ids.
- Extended existing contract tests instead of adding a new test system.
- Targeted verification passed: node --check, `tests/scenario_chunk_contracts.test.mjs`, `tests/scenario_lifecycle_runtime_behavior.test.mjs`, and the two Python contract files.
- TNO water geometry validator passed.
- TNO strict contract failed on pre-existing checked-in chunk metadata drift, then chunk-assets rebuild exposed `tno_qyzylorda_inland_water` missing from the runtime checkpoint path. Started a runtime_topology rebuild from the newest source-backed checkpoint to repair the data side.
- Architect verification returned WATCH: runtime code repair is sound; TNO strict contract red is a separate checked-in data rebuild task and was kept out of this runtime fix scope.
- Changed-files deslop review passed with no extra simplification required.
- A Playwright lane was started through the main checkout `node_modules` via `NODE_PATH`, but it stalled without producing assertion output, so it was terminated and not used as completion evidence.
