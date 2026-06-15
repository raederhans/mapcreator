# A11y Home/App Fix Context

## Findings

- App controls had several visible controls with weak or missing accessible names, including file inputs, overlay panel toggles, legend buttons, and generated legend label inputs.
- Decorative flag images in the inspector were announced as content even though nearby text already carries the identity.
- Appearance and transport tab groups exposed tab roles but lacked full keyboard navigation and roving focus.
- The map canvas area lacked a clear region name and canvas fallback text.
- Homepage tertiary text contrast was low against the existing light background.

## Decisions

- Preserve layout and visible copy wherever possible.
- Use existing `data-i18n` and `data-i18n-aria-label` paths for new labels.
- Keep icon button glyphs visually unchanged and mark glyph spans `aria-hidden` while the button owns the accessible name.
- Use focused behavior tests around changed controllers instead of broad browser regression loops.

## Verification Evidence

- Final a11y report: `.runtime/reports/generated/a11y/homepage-app-a11y-scan.json`
- Final scan summary: landing `axe=0`, `pa11y=0`, Lighthouse accessibility score `1`, failed audits `[]`; app `axe=0`, `pa11y=0`, Lighthouse accessibility score `1`, failed audits `[]`.
- The local dev server on port `8031` was stopped after scanning.
