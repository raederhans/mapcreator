# Landing Product Showcase Plan

## Goal

Upgrade the static landing page from a lightweight project showcase into a product-grade map product homepage.

## Acceptance Criteria

- Add a lightweight Japan pilot mini preview with keyboard-friendly tab controls.
- Expand product capability sections around cartography, scenario editing, spatial data, transport, imagery, and project management.
- Add dedicated data source, edition/license, sample case, and FAQ sections.
- Keep implementation in native HTML/CSS/JS with no new dependencies.
- Keep all core copy in initial HTML, with JavaScript only enhancing language switching, reveal, and preview tabs.
- Sync `dist` with `landing` through the existing pages-dist verifier.

## Evidence Adopted

- W3C APG tabs/accordion guidance: use native buttons, ARIA tab roles, roving tabindex, and clear selected state.
- MDN details/summary guidance: use native disclosure controls for FAQ.
- Google Search Central guidance: keep meaningful content in the initial HTML and give images useful context.
- Existing project data: Japan road and rail preview manifests are the strongest transport sample; data source governance is tracked through `data/source_ledger.json`, `data/CATALOG.json`, transport manifests, and provenance sidecars.

## Tasks

- [x] Inspect existing landing structure and project assets.
- [x] Run external best-practice research lane.
- [x] Run repo asset exploration lane.
- [x] Implement landing content and interaction changes.
- [x] Sync `dist` output.
- [x] Run targeted verification.
- [x] Run final review/bug pass.
- [x] Archive this task after completion.
