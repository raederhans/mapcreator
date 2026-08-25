# Landing Home Revamp Plan

## Goal

Turn the independent `landing/` showcase into a concise, evidence-backed and visually reliable homepage while preserving the existing Scenario Forge design language and keeping the editor/runtime boundary unchanged.

## Scope

- Reduce the homepage from 19 sections to a focused six-part story.
- Rewrite English and Chinese public copy around user outcomes, current capabilities, evidence and explicit limitations.
- Repair confirmed content errors, metric scope labels, map visual correctness and interaction discoverability.
- Improve desktop/mobile layout, touch targets, motion restraint, failure states and social preview consistency.
- Keep `landing/` static and independent; update only the tests and generated Pages mirror required by the final accepted source change.

## Sources of truth

- Current base: `origin/main@f118a101d30373c507075da32267969b22197338`.
- Audit: parent checkout `.runtime/reports/generated/showcase-site-audit-2026-08-25.md`.
- Product facts: `README.md`, `LICENSE`, `data/source_ledger.json`, `data/CATALOG.json`, scenario registry and landing metadata.
- Map outputs: canonical landing generators and their checked-in JSON/SVG/WebP artifacts.
- Browser profile: `ops/browser-mcp/inspection-profile.toml`.

## Design thesis

- Visual thesis: preserve the distinctive dark cartographic, teal-and-gold Scenario Forge identity, but let maps and evidence carry the page instead of repeated rounded cards and decorative chrome.
- Content plan: Hero → three real outputs → one workflow → current capabilities and boundaries → data/provenance → FAQ and closing action.
- Interaction thesis: use deliberate map-state transitions, visible tabs and zoom controls, restrained reveal/hover feedback, keyboard alternatives and a reduced-motion fallback; no decorative motion may obscure map meaning.

## Stages

- [x] Stage 1: Freeze ownership, baseline screenshots and map/data correctness criteria.
- [x] Stage 2: Implement six-part information architecture and bilingual factual copy.
- [x] Stage 3: Repair map assets, controls, metadata failure states and scope labels.
- [x] Stage 4: Apply responsive, typography, spacing, touch-target and social-preview polish.
- [x] Stage 5: Integrate workstreams sequentially and update focused contracts.
- [x] Stage 6: Run single-owner desktop/mobile browser acceptance and final review.

## Acceptance criteria

- No more than seven main sections; navigation corresponds to the retained sections.
- The first two screens explain the product, show a real output and expose a clear Demo action.
- Every public metric states object, geographic scope and processing stage.
- The three primary examples expose source, scope and license/provenance paths without overstating reproducibility.
- License FAQ distinguishes MIT project code/docs from third-party data terms.
- Maps contain no confirmed ownership, extent, layer, label, crop or interaction-state error in the accepted browser states.
- Core map interactions have visible controls, keyboard alternatives, reduced-motion behavior and visible failure fallback.
- 390, 768 and 1440 widths have no page-level horizontal overflow; primary touch targets are at least 44px.
- English and Chinese copy remain complete and usable.
- Focused landing/sample contracts pass; final browser console and local asset checks are clean.

## Non-goals

- No CMS, frontend framework migration, new design system or embedded full editor.
- No editor/runtime feature expansion, scenario-data redesign or backend/cloud implementation.
- No release, deployment, remote history rewrite or parent-checkout cleanup.

## Risks and constraints

- Parent checkout has unrelated WIP and must remain untouched.
- `landing/index.html`, `landing/app.js` and `landing/styles.css` are shared hotspots; integration is sequential even when analysis runs in parallel.
- Generated assets must come from canonical generators; hand-edited image fixes are not accepted.
- Dev server, browser, builders and shared `.runtime` output have one owner: the primary integration task.
- Workstream tasks may implement bounded files but must not merge, push, regenerate Pages dist or run shared live processes.
