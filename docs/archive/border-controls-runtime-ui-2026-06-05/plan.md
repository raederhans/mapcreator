# Border Controls Runtime UI Plan

## Goal

Fix the Appearance > Borders controls so internal borders, country borders, and coastlines visibly respond to their style parameters, and make the nested border controls match the surrounding Appearance panel style.

## Acceptance

- Internal border opacity can reduce the rendered line alpha down to zero.
- Country border and coastline style configs include opacity, and color/opacity/width are used by the draw owner.
- The Chinese label for `Empire Borders` becomes country-border wording.
- Border control rows use scoped card-like spacing consistent with nearby Appearance controls.
- Targeted owner/render tests pass.
- `npm run verify:pages-dist` syncs `dist/app`.

## Steps

- [x] Map the current UI -> state -> renderer path.
- [x] Add focused border appearance owner and tests.
- [x] Wire new opacity fields into defaults, normalization, import/export expectations, and rendering.
- [x] Update i18n and scoped CSS.
- [x] Run targeted checks and pages-dist sync.
- [x] Final review for simpler/stabler implementation.
