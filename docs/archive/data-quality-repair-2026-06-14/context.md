# Data Quality Repair Context

## Current State

- Created isolated worktree from `main` HEAD `979b20deccdc4ca98e4dc6ae6acd0d3ee398576e`.
- The original checkout is dirty and must stay untouched.
- OMX ultragoal created 3 goals:
  - `G001-high-restore-tno-strict-scenario-con`
  - `G002-medium-fix-tno-tag-core-water-geomet`
  - `G003-low-improve-catalog-md-governance-co`
- Codex goal is active for the aggregate repair plan, but its objective was created before ultragoal generated its stable aggregate objective.

## Initial Evidence

- TNO strict failure: startup bundle `detail_chunk_manifest_sha256` and `build_snapshot.json` hash drift.
- HOI4 1936/1939 strict failure: build snapshot input/output/fingerprint drift and missing audit fingerprint.
- Data manifest failure in the original dirty checkout: `locales.json` and palette outputs had size/hash drift.
- Verification selector failure: locale, alias, and HGO name catalog files produced no recommended commands.

## Process Notes

- Main thread owns all live tests and builders.
- Subagents may do bounded static analysis or disjoint implementation only.
- Use `.runtime/reports/generated/data-quality-repair/` for new runtime evidence.

## 2026-06-13 Progress

- G001 repaired TNO, HOI4 1936, and HOI4 1939 strict scenario failures using `tools/check_scenario_contracts.py --strict --write-safe`.
- G001 added `tests.test_i18n_audit` to the verification route registry for locale, alias, and HGO name catalog files.
- G001 adjusted `tests.test_i18n_audit` so clean worktrees without `dist/app/data/locales.json` still validate source locales and additionally validate dist locales when present.
- Verification evidence:
  - `g001_high_unittest_rerun.log`: 73 tests passed.
  - `g001_data_health.json`: exit 0.
  - `g001_check_data_catalog.log`: exit 0.
  - `g001_selector_locales.json` and `g001_selector_aliases_hgo.json`: selector now recommends `python -m unittest tests.test_i18n_audit -q`.
- Ultragoal checkpoint attempt failed because the active Codex goal objective differs from `.omx/ultragoal/goals.json` aggregate objective. Keep this as a process issue to reconcile before final goal completion.

## 2026-06-14 Progress

- G002 repaired TNO capital hints and core tag references against registered country tags.
- G002 rebuilt TNO water runtime/chunk outputs through the `water` domain planner. The planner now publishes the `polar_runtime` scope so the water-only path avoids unrelated checkpoint requirements.
- G002 added strict TNO capital/core checks and raw longitude range checks so the repaired class of issues is now contract-visible.
- G002 aligned global airport and port pack fields with workbench filters, including airport type/status categories and numeric port manager type codes.
- G002 connected `locales` and `geo_aliases` through `data/runtime_asset_registry.json` and removed hardcoded locale defaults from the loader path.
- G002 added appearance preset i18n keys and source/baseline locale coverage.
- G003 added `schemaRef`, `hashRef`, and `cachePolicy` visibility to `data/CATALOG.md`.
- G003 added warning-level empty `hashRef` grouping to `tools/check_data_catalog.py`.
- G003 reduced i18n audit noise for known source labels and simple numeric unit literals.
- Targeted evidence:
  - `python tools/check_data_catalog.py`: exit 0 with empty `hashRef` warning summary.
  - `python -m unittest tests.test_data_catalog_contract tests.test_i18n_audit tests.test_scenario_rebuild_planner -q`: 38 tests passed.

## Final QA

- Independent review found two closeout issues:
  - final gate logs needed durable `final_*` evidence under `.runtime/reports/generated/data-quality-repair/`;
  - `validate_tno_publish_checkpoint_dir()` had a write side effect through legacy `capital_hints.json` hydration.
- Both review issues were addressed:
  - final gate logs were written under `.runtime/reports/generated/data-quality-repair/final_*`;
  - legacy capital hints hydration now happens only in the publish checkpoint hydration path, and validation remains read-only.
- Extra TNO builder QA exposed stale test expectations for Gulf of Alaska supplement geometry and old explicit country color overrides. Tests were updated to current data contracts, and `python -m unittest tests.test_tno_bundle_builder -q` passed.
- Final evidence:
  - `final_py_compile.log`: exit 0.
  - `final_node_check.log`: exit 0.
  - `final_data_health.json`: `ok=true`; report-only large-file warnings remain out of scope for this task.
  - `final_check_data_catalog.log`: exit 0, empty `hashRef` warning summary emitted.
  - `final_tno_1962.strict_contract.log`, `final_hgo_1936.strict_contract.log`, `final_hoi4_1936.strict_contract.log`, `final_hoi4_1939.strict_contract.log`: all exit 0.
  - `final_tno_1962.water_geometry.log`: exit 0.
  - `final_unittest.log`: 204 tests passed.
  - `final_selector_check.log`, `final_selector_locales.json`, `final_selector_aliases_hgo.json`: selector routes pass and recommend i18n audit for locale/alias/name catalog changes.
  - `final_verify_pages_dist.log`: exit 0.
  - `final_git_diff_check.log`: exit 0 with line-ending warnings only.
- Ultragoal checkpoint remains a workflow-state mismatch: `.omx/ultragoal/goals.json` expects the generic aggregate Codex objective, while the active Codex goal uses the task-specific objective. `omx ultragoal checkpoint` rejects all three G001/G002/G003 checkpoint attempts for that mismatch. Code and data verification are complete; the ultragoal durable artifact remains pending.
