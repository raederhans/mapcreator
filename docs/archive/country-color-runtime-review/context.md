# Context

- Restored KOR from reset/palette color `#009163` to historical manual color `#82132e`.
- Audited other explicit/manual-like country colors against pre-reset commit `f8464a03`; `MAG`, `ONG`, and `GAY` were also reset to palette-audit colors and are now restored to `#415638`, `#0d4510`, and `#4f4f4f`.
- Kept `GNG` palette-managed because it belongs to the east Asia ownership rule path and the current palette audit target is intentional.
- Fixed startup persistent cache invalidation by adding `countries_sha256` to scenario bootstrap cache key parts and to the scenario manifest source payload.
- Updated checked-in startup bundles, gzip mirrors, and manifest `source.countries_sha256`.

# Verification

- `python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_second_wave_color_sources_match_expected_targets tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_second_wave_runtime_colors_keep_manual_sources_locked tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_current_tno_explicit_country_colors_are_locked_and_bundled tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_tno_runtime_country_colors_follow_mixed_palette_policy -q`
- `node --test tests/startup_hydration_behavior.test.mjs`
- `npm run verify:pages-dist`
- `python -m py_compile tools/patch_tno_1962_bundle.py`
- `git diff --check` on changed files
- HTTP probe from local dev server returned KOR/MAG/ONG/GAY/GNG colors from `startup.bundle.en.json`.
