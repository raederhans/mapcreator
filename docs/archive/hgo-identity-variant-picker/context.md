# HGO identity variant picker context

- User selected the country detail raw HGO variant tag list and asked to replace it with selectable naming and flag options.
- Live process owner: main Codex thread owns the running dev server, browser smoke, and test commands.
- Shared file note: `css/style.css` is already touched in this batch, so final CSS integration stays in the main thread.
- Implementation keeps HGO variant selection in `runtimeState.hgoIdentity.variantSelections` by country code.
- Browser smoke confirmed France detail had no raw variant list, exposed 22 options, and changing to `communism` updated detail and list flag URLs to `FRA_communism.png`.
- Map renderer has no HGO flag layer; HGO settings changes now call the existing map `render()` entry so future canvas consumers read the same state after selection changes.
