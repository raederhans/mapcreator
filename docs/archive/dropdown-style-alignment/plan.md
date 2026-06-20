# Dropdown Style Alignment Plan

## Goal

Align native select controls with the Scenario dropdown visual language without rewriting select behavior.

## Scope

- Update shared dropdown chrome in `css/style.css`.
- Preserve existing native `<select>` semantics and scenario custom menu behavior.
- Sync generated Pages dist after source CSS changes.

## Acceptance

- Native selects use the same rounded, soft-gradient, compact control style as `#scenarioSelectButton`.
- Hover, focus, and disabled states remain visible.
- Existing UI contract for native select chrome passes.
- Source and checked-in dist CSS stay in sync.
