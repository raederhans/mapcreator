# Political Topology Review Fix Context

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-political-review-fix`
- Branch: `codex/review-political-holes-fix`
- Base: current `main` at `56182f3f`
- Review target: political topology repair files from `0bf9dada`
- Live process owner: main agent only; no browser or long test process active.
- Architect lane returned WATCH: make retention rules more declarative, cover all FR detached components in tests, and clarify the geoBoundaries shell choice.
- Local static/data check confirmed `data/europe_topology.na_v2.json` correctly contains complete SO Sanaag/Sool, while FR detached territories are expected to enter only through runtime primary-gap composition.
- Patch moved runtime primary retention rules into `map_builder/config.py`, generalized the builder matcher, expanded tests to cover GF/GP/MQ/RE/YT plus an overlap-threshold case, and documented the geoBoundaries source-union shell choice.
- Code-review lane returned COMMENT with one low finding: remove the unused `shell_geom` parameter from `_build_geo_boundaries_features`. Fixed by deleting the parameter, narrowing shell precomputation to Natural Earth countries, and updating tests.
- Final architecture re-review returned CLEAR.
- Strict scenario contract initially failed because byte-exact TNO scenario JSON files were not covered by `.gitattributes eol=lf`; added LF attributes for scenario `manifest.json` and `geo_locale_patch*.json`, then rebuilt Pages-dist.
- Verification so far: `python -m unittest discover -s tests -p test_political_topology_gap_contract.py -q`; `python -m py_compile map_builder/config.py tools/build_runtime_political_topology.py map_builder/processors/africa_admin1.py tests/test_political_topology_gap_contract.py`; `node tools/select_verification_targets.mjs --check`; `npm run verify:scenario-contracts:strict`; `npm run verify:pages-dist`; `git diff --check`; runtime data spot-check for GF/GP/MQ/RE/YT and SO Sanaag/Sool.
