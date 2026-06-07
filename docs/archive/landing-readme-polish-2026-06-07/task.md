# Landing + README Polish 2026-06-07

## Goal

Finish the approved P0 and P1 polish for the landing page and README:

- Fix responsive `clamp()` bugs.
- Consolidate landing palette around the mapmaking teal/warm earth tokens.
- Add hover, reveal cascade, scrollspy, and hero image decode polish.
- Rasterize display-only SVG assets to WebP while keeping the interactive Europe SVG.
- Align README logo, terminology, and export wording.

## Constraints

- Main thread owns all live tests, browser checks, and asset generation.
- Subagents may perform static review only.
- Keep SVG source files as source-of-truth.
- Preserve the interactive `europe-1936-showcase.svg` as SVG.
- Do not include unrelated dirty files from the parent checkout.
