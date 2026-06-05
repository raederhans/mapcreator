# Context

- HGO entries already carry `paletteRegionKey` from the import path.
- Other palette libraries usually have `mappedIso2`, and the current scenario country metadata exposes `continent_id` and `continent_label`.
- Current grouping sends mapped entries straight to the `Countries` section, so geographic metadata cannot affect non-HGO sources.
- Added `paletteLibraryGroupingMode` with `default` and `region` modes.
- Region mode resolves mapped palette entries through `countryGroupMetaByCode` or `scenarioCountriesByTag`, then falls back to imported `paletteRegionKey`.
- Verification completed: JS syntax checks, focused palette grouping test, `npm run verify:pages-dist`, dist syntax checks, and diff whitespace check.
- Browser smoke note: attempted Playwright DOM check, but this checkout has no installed Playwright package in `node_modules`.
- Live process owner: none.
