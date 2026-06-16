# TNO Zoom Water Repair Review Context

## Current State

- Former working branch: `codex/tno-zoom-water-fill-repair`; recovery commits `71b91375..417c7b27`.
- Last repair commit: `71b91375`.
- Main checkout remains dirty and behind/ahead, so this review stays inside the repair worktree.

## Constraints

- Keep the renderer continuity path narrow: selection/topology drift may reuse a complete interaction composite; scenario, DPR, canvas, color, context, and signature drift must reject.
- Keep TNO in exclusive water mode.
- Do not change README.
- Keep temporary runtime artifacts under `.runtime/`.

## Live Process Ownership

- No live dev server, browser run, long build, or checkpoint builder is active at review start.
- Main agent owns all verification commands unless explicitly handed off.

## Findings

- Code review found that cloned base-geography water was present in TNO water surfaces but still overlapped runtime political and land masks.
- Local reproduction before rebuild showed overlap area for all tracked clone IDs, with the largest at `lake_superior`.
- Code review found that Playwright readiness treated `runtime_topology_url` as chunk-runtime evidence, which can block non-chunked topology-backed scenarios.
- After adding the political/land cut, `runtime_topology` rebuild succeeds from checkpoint. The cut changes generated country metadata for affected owners, so `strict-block` correctly blocks publish when scenario data differs from checkpoint. Publishing this intentional generated-data change requires the existing `backup-continue` policy so the previous scenario outputs are backed up and the checkpoint can become the new scenario contract.
- Strict contract then exposed 14 new geo-locale collision candidates from water-cut split clones. Those split IDs were added to `geo_locale_reviewed_exceptions.json`, geo-locale/support assets were rebuilt against checkpoint `6a685bd0b7557396`, and `build_snapshot.json` was refreshed by the existing safe contract repair.

## Verification

- `python -m unittest tests.test_tno_water_geometries.TnoWaterGeometryDataContractTest.test_tno_base_geography_water_clones_are_cut_out_of_runtime_land_surfaces tests.test_playwright_app_ready_gate_contract tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_apply_tno_feature_assignment_overrides_skips_water_cut_ids tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_apply_tno_feature_assignment_overrides_follows_cut_feature_source_map -q` passed.
- `node --test tests/scenario_chunk_contracts.test.mjs` passed.
- `npm run test:py:tno-water-repair-contracts` passed.
- `npm run verify:scenario-contracts:strict` passed.
- `npm run verify:pages-dist` passed.
- `node --check tests/e2e/support/playwright-app.js` and `python -m py_compile tools/patch_tno_1962_bundle.py` passed.
