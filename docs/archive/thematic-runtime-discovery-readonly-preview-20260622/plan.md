# Thematic Runtime Discovery and Read-only Panel Preview Plan

## Goal

Expose the fixture-only thematic catalog to the frontend runtime and show a read-only UI preview without enabling main-map thematic rendering, real-source ingestion, network downloads, scenario save-format changes, default visibility changes, or state writes.

## Acceptance Criteria

- Runtime code can load `data/thematic_layers/index.json` and normalize all three fixture layers.
- Contract code exposes thematic layer summaries with stable fields: id, theme, title, geometry kind, status, source policy, default style, manifest path, preview capability, and render disabled reason.
- UI shows a read-only thematic/data-layers preview with fixture-only status, hidden-by-default status, manifest/default renderer metadata, and no toggle/color/opacity controls.
- Diagnostics and summaries never show `undefined`, `null`, or `NaN`.
- Fixture-only layers report `supportsMainMapRender: false`.
- Existing Appearance, Map Content, Transport, architecture boundary, state-write allowlist, import graph, and Pages dist contracts remain green.

## Non-goals

- No WGI, HDI, GHSL, WorldPop, or other real-source ingestion.
- No network download.
- No thematic canvas rendering.
- No scenario save-format or default visual parameter changes.
- No new runtime state writer.

## Work Plan

1. Map existing thematic data, data-service conventions, layer-panel contracts, diagnostics, UI composition, and tests.
2. Add a small read-only catalog loader in the existing frontend runtime style.
3. Add thematic contract conversion and diagnostics summaries.
4. Add a read-only thematic section in the existing layer panel surface.
5. Extend focused Node/Python tests before broad verification.
6. Rebuild Pages dist through the official builder.
7. Run independent `code-reviewer` and `architect` lanes, fix concrete findings, then integrate.

## Live Process Ownership

Main Codex agent owns all live tests, builds, Pages dist generation, and final integration. Subagents may do static code mapping and final review only.
