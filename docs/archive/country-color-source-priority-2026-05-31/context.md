# Country Color Source Priority Context

2026-05-31: Started from report that manually assigned colors for non-starting-but-valid tags such as Korea were reset after earlier updates. The suspected failure mode is color source priority: game/tag palette colors may be overriding curated scenario/manual colors.

2026-05-31: Confirmed current runtime chain:
- `color_resolver.resolveFeatureColor()` resolves owner colors from `runtimeState.sovereignBaseColors` / `countryBaseColors`.
- `scenario_apply_pipeline.prepareScenarioApplyState()` builds those maps from `buildScenarioOwnerColorMapDetails()` plus `getScenarioFixedOwnerColors(countryMap)`.
- Current TNO startup bundles serialize `scenario.countries`; `startupApplySeed` is not serialized now, so the active risk is generator policy drift and stale bundled countries, not a live `scenario_color_map` seed override.

2026-05-31: Data finding:
- `KOR` exists in TNO `countries.json` as `Korean Residency-General`, color `#009163`, source `manual_rule`, primary rule `tno_1962_kor_manual_override`.
- `PRK` exists in the palette/audit files but not in active TNO `countries.json`; the Korean map ownership currently resolves through `KOR`.
- Several explicit/manual/controller tags had no `color_policy` in checked-in `countries.json`, so a later rebuild could classify them as palette-managed and sync them back to audit/palette colors.

2026-05-31: Implemented focused fix:
- `tools/patch_tno_1962_bundle.py` now treats controller-only, generated, dev-manual-created, and `*_manual_override` country entries as locked colors during policy backfill.
- Current TNO `countries.json` and both startup bundles now carry `color_policy: "locked"` for those explicit tags, and startup bundle `source.countries_sha256` was refreshed.
- Added a regression test that checks explicit colors are locked and startup bundles match `countries.json` for color and color policy.

2026-05-31: Verification:
- `python -m py_compile tools/patch_tno_1962_bundle.py`
- `python -m unittest tests.test_tno_bundle_builder`
- startup bundle gzip mirrors match JSON, and both bundle `source.countries_sha256` values match current `countries.json`.

2026-05-31: Post-review fix:
- Initial fix locked too many regional rule colors because any rule with `color_hex` was treated as explicit. Narrowed the policy to controller-only, generated, dev-manual-created, and `*_manual_override` entries.
- Verified `GNG`, `KAZ`, `ANG`, `MZB`, `RWA`, `ZAM`, and `ZIM` remain palette-managed while `KOR`, `MAG`, `ONG`, `GAY`, controller-only tags, and dev-manual tags stay locked.
