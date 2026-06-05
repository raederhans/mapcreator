# Context

- Live process owner: main agent owns the dev server already running on port 8000; this task will not start a second server.
- Existing dirty work includes earlier inspector height changes and HGO translation data. This task will only touch files needed for the country color suggestion control plus dist/test sync.
- Implemented `buildPaletteColorSuggestionsForCountry` in the palette manager. It scores exact iso2 matches first, tag matches second, and exact normalized name matches third.
- The compact country color row now renders a dropdown. Choosing a suggestion updates `runtimeState.selectedColor` and the swatch UI; it does not directly repaint the map.
- Verification passed: JS syntax checks, UI mainline contract, JSON validation, a small USA/US matching smoke, `npm run verify:pages-dist`, and `git diff --check` on touched files.
