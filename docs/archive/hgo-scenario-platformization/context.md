# HGO Scenario Platformization Context

## Running Notes

2026-06-11T02:42:58Z:
- Created worktree C:\Users\raede\Desktop\dev\mapcreator-hgo-scenario-platformization on branch codex/hgo-scenario-platformization.
- Base commit is origin/main 59e9ae87babb082c89df2280c5d1e229eedc7175.
- Main checkout is dirty and behind origin/main; this worktree isolates HGO work from that state.
- Loaded AGENTS.md and data/AGENTS.md.
- Loaded lessons learned. Relevant standing rules: render pass lifecycle must own invalidation; projection cache signatures must cover inverse-mapping inputs; HGO runtime seed must combine mod and vanilla colors; HGO preview hit payload must expose public countryCode and hgoRuntime.ownerTag.

## Root-Cause Evidence To Preserve

- Current preview draws outside the pass list through renderHgoRuntimePreviewIfReady("draw-canvas").
- Current raster renderer can clear and putImageData into the target canvas.
- Projection sampling depends on DPR, logical size, projection fit, and zoom transform alignment.
- Digit-prefixed HGO owner tags can be damaged by normalizeCountryCodeAlias.

## Live Process Ownership

Owner: main agent.
Active process: none.
Log path: none yet.

Subagent rule:
- Subagents may do static analysis or work in disjoint files.
- Subagents must not start or monitor long tests/builds/dev servers while the main agent owns verification.

## Decisions

- Preserve HGO raster preview as a developer tool.
- Render HGO preview through hgoPreview pass between political and contextBase.
- Use identity zoom as hgoPreview pass reference transform so zoom/pan uses existing drawImage transform reuse.
- Use hgo_1936 as the new editable vector scenario id.
- Use HGO-S{stateId} as stable vector feature ids.
- Store actual owner tags in owners.by_feature.json.
- Store HGO owner tags in cntr_code/country_code and owners.by_feature.json so scene identity and editing identity agree.
- HGO scene loading must use runtime_topology.topo.json; data/hgo_runtime/provinces.bmp remains a preview/build input and is referenced only by source sha metadata.
- Digit-prefixed HGO owner tags are accepted only through explicit owner/country code inputs; country code derivation from feature ids remains alphabetic so regular NUTS ids such as DE1 still resolve to DE.
- HGO builder custom output directories do not update data/scenarios/index.json. Default checked-in data/scenarios/{scenario_id} output remains auto-registered.
- controllers.by_feature.json is retired from the formal scenario contract and is removed from HGO output until a runtime controllers_url path is intentionally restored.
- capital_hints_url is now part of strict snapshot inputs.

## Verification Log

2026-06-11:
- PASS npm run test:node:hgo-runtime-preview
- PASS python -m unittest tests.test_runtime_hooks_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract -q
- PASS npm run test:node:renderer-runtime-state-behavior
- PASS node --check js/core/map_renderer.js js/core/hgo_runtime_preview.js js/ui/toolbar/hgo_runtime_preview_controller.js js/core/renderer/render_pipeline_passes.js js/core/state/renderer_runtime_state.js
- PASS npm run test:node:hgo-projection-model
- PASS npm run test:node:hgo-raster-renderer
- PASS python -m py_compile scenario_builder\hgo\__init__.py scenario_builder\hgo\vectorizer.py scenario_builder\hgo\compiler.py tools\build_hgo_scenario.py map_builder\contracts.py
- PASS python -m unittest tests.test_hgo_runtime_seed_builder.HgoRuntimeSeedBuilderTest.test_hgo_vector_scenario_preserves_digit_prefixed_owner_tags tests.test_scenario_contracts.ScenarioContractTest.test_hgo_scenarios_use_vector_contract_profile -q
- PASS python tools\build_hgo_scenario.py (log: .runtime/reports/generated/hgo_1936/build.log)
- PASS npm run verify:scenario-contracts:hgo
- PASS node --test tests/feature_identity_shared.node.test.mjs tests/dev_workspace_selection_ownership_behavior.test.mjs
- PASS python -m unittest tests.test_scenario_contracts.ScenarioContractTest.test_hgo_scenarios_use_vector_contract_profile tests.test_scenario_contracts.ScenarioContractTest.test_checked_in_hgo_scene_uses_vector_topology_not_runtime_bmp -q
- PASS final review fixes: node identity/dev workspace tests, targeted HGO builder/snapshot unittest group, py_compile, npm run verify:scenario-contracts:hgo
- PASS python tools\build_hgo_scenario.py after review fixes. New HGO snapshot_fingerprint: 352766efda9d97f4bd58f29efc58547aaeba37063de57e95a64c09680374bf5b.
- PASS npm run verify:pages-dist after review fixes. Dist size: 1091.74 MiB.
- PASS npm run verify:hgo-runtime-poc after review fixes.
- PASS git diff --check. Only Windows LF-to-CRLF warnings were reported.
- PERF CONTROL: npm run perf:gate failed on this branch for hoi4_1939.totalStartupMs current=6772.1ms, baseline=5205.7ms, limit=5986.6ms, contract_mismatches=[].
- PERF CONTROL: clean origin/main worktree C:\Users\raede\Desktop\dev\mapcreator-hgo-perf-control failed the same gate for hoi4_1939.totalStartupMs current=6783.0ms, baseline=5205.7ms, limit=5986.6ms. Treat this as current environment/baseline red, not an HGO branch regression.
