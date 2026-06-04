# HGO identity variant picker

## Goal
- Replace raw HGO variant badges in country detail with a selectable naming and flag option control.
- Keep the selection in HGO identity runtime state so country rows and the active detail refresh from the same choice.
- Reuse existing HGO resolver and flag catalog data; avoid a separate selection model.

## Acceptance
- Country detail no longer renders the raw `.hgo-identity-variant-list` tag pile.
- Detail shows a base option plus HGO variant options with readable ideology labels.
- Changing the option updates the displayed HGO flag for that country without reloading the page.
- Targeted controller/resolver tests pass.

## Steps
- Inspect the current detail renderer, resolver, and any map/flag refresh hook.
- Add selected variant support to the resolver and HGO runtime settings.
- Replace the badge list with a compact picker and flag preview.
- Add focused tests and run syntax checks.
- Smoke-check the running local page.
