# Belarus Fragment Interaction Task

## Scope

Implement runtime-only visual/interaction camouflage for Belarus detached inland fragments.

## In Scope

- `data/country_feature_policies.json`
- `map_builder/country_feature_policies.py`
- `js/core/country_feature_policies.js`
- `js/core/map_renderer.js`
- `js/core/renderer/political_collection_owner.js`
- Focused tests under `tests/`

## Out of Scope

- Editing political topology source files.
- Rebuilding country geometry.
- Changing selection ownership semantics.
- Broad UI restyling.

## Verification

- `python -m unittest tests.test_country_feature_policies_contract tests.test_map_renderer_political_collection_boundary_contract -q`
- `node --test tests/political_collection_fragment_camouflage_behavior.test.mjs`
- `git diff --check`
