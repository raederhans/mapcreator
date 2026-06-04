# Context

- User reported HGO color library has a single huge Extra section with 1284 entries.
- HGO palette map is almost entirely unmapped, so the existing mapped/unmapped grouping cannot provide geographic structure.
- HGO source country files include `capital = <state id>` and state files include owner/core information, but the checked-in HGO catalog does not expose geography.
- Best implementation path: enrich palette entries at import time with broad geography where source data makes it possible, then keep the front-end renderer simple.
- Implementation adds broad region metadata during palette import, with manual HGO overrides for source tags whose capital geometry is missing or misleading.
- Regenerated HGO data now has zero unclassified palette entries.
- Front-end grouping uses existing details sections; row rendering keeps one primary color and folds distinct map/UI/country-file colors under the row.
- Verification completed: import tests, JS syntax checks, `verify:pages-dist`, whitespace check, local server health check, and DOM/static data checks.
- Current live process owner: none.
