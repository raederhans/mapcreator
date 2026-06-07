# Landing Hero Scenario Maps Context

## 2026-06-06 Start
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-landing-hero-scenario-maps`
- Branch: `codex/landing-hero-scenario-maps`
- Base commit: `fb74d64b Make the Japan landing preview data-backed`
- Main checkout has unrelated dirty `landing/`, `dist/`, `dist/app/`, docs, and test changes, so this work stays isolated.

## Constraints
- Preserve the lower 1936 showcase output.
- Use repository data for all four hero maps.
- Keep `verify:pages-dist` as the source/dist contract gate.
- Shared files are edited serially by the main thread.
- Temporary outputs belong under `.runtime/`.

## Final Implementation Notes
- `tools/build_landing_europe_1936_showcase.py` now builds the legacy 1936 showcase plus four hero scenario SVG/JSON assets.
- TNO capital labels come from `capital_defaults.partial.json`; Atlantropa topology and metadata are read and recorded.
- Blank uses the shared Europe runtime political topology as a neutral land/border source, with area-ranked clipping and path limit metadata.
- Hero chips update image `src`, `alt`, `aria-pressed`, `data-hero-mode`, and `data-hero-metadata`.
- `dist/` is regenerated from `landing/`, and pages-dist tests assert asset copy parity.

## Verification Evidence
- `npm run verify:pages-dist` passed after final fixes: 32 Python tests OK, 1 Node landing showcase test passed.
- `git diff --check` passed with only Windows line-ending warnings.
- `python -m py_compile tools\build_landing_europe_1936_showcase.py tools\build_pages_dist.py` passed.
- Browser smoke at `http://127.0.0.1:8029/#hero` confirmed all four chips load the expected SVG/JSON, alt text, and pressed state.
- Screenshots are under `.runtime/browser/landing-hero-scenario-maps/`.

## Merge Note
Main checkout remains dirty with unrelated landing/dist work. This branch is committed and pushed separately; merge into main should happen after the existing main checkout changes are reviewed or cleaned.
