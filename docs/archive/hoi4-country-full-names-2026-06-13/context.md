# Context

- Current branch is dirty and already has unrelated appearance/transport work. This task will avoid shared UI files and only touch HOI4 scenario naming data, generator support, tests, and this task doc.
- `data/scenarios/hoi4_1936/countries.json` and `data/scenarios/hoi4_1939/countries.json` are checked-in generated artifacts. `startup.bundle.en.json`, `startup.bundle.zh.json`, and gzip sidecars embed the country payload and track `source.countries_sha256`.
- Runtime translation can use `display_name_zh` through scenario country display helpers, while older scenario name map paths still translate `display_name` via `data/locales.json`.
- Added `data/scenario-rules/hoi4_country_full_names.json` as the rebuildable bilingual source. The builder now emits `display_name_en` and `display_name_zh`, and fails early when a provided full-name table misses a scenario tag or a language.
- Updated 1936/1939 `countries.json`, startup bundles, gzip sidecars, startup locale subsets, scenario manifest/audit snapshot fingerprints, scenario build snapshots, `data/locales.json`, and `data/manifest.json`.
- Verification passed: 17 targeted unit tests, both HOI4 bundle checks, both strict scenario contract checks, and `git diff --check` for touched code/data paths.
