# HGO Identity Inspector Plan

## Summary

Implement HGO as a read-only identity layer inside the country inspector. The first version uses HGO place names, flag PNG manifest, palette entries, and alias data for inspector list rows, search, and selected-country detail. Map ownership, scenario runtime data, geometry, and default colors remain unchanged.

## Acceptance Criteria

- HGO identity resolver supports exact, reviewed alias, suggested alias, and missing matches.
- Inspector state exposes `hgoIdentity.enabled`, `hgoIdentity.nameMode`, and `hgoIdentity.showSuggestedAliases`.
- Country list rows can show small HGO flags and HGO names when the inspector toggle is active.
- Selected detail shows a larger flag preview, multilingual HGO names, palette color, and flag variants.
- Search matches scenario names, HGO names, tags, reviewed aliases, and suggested aliases.
- Alias data is registered through runtime asset registry and data catalog governance.
- Targeted node, Python, and data checks pass before merge.

## Implementation Steps

1. Create task docs and keep progress in this directory.
2. Add `data/hgo_catalogs/hgo_identity_aliases.json` and register it.
3. Add `js/core/hgo_identity_resolver.js`.
4. Add inspector-only HGO identity state defaults.
5. Load HGO assets in `js/ui/sidebar.js` and inject resolver outputs into the inspector controller.
6. Extend `js/ui/sidebar/country_inspector_controller.js` for controls, rows, selected detail, and search.
7. Add scoped CSS for flags, badges, and narrow sidebar stability.
8. Add focused tests and run data governance checks.
9. Review, fix findings, merge to `main`, commit, push, and clean the worktree.

## Boundaries

- HGO identity is display-only.
- HGO name toggle affects inspector list, selected detail, and inspector search.
- Flag variants are preview-only.
- Suggested alias matches are weak matches and visible as suggested.
- HGO palette is shown as auxiliary identity data and is not used as runtime default country color.
