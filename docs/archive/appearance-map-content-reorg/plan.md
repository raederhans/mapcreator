# Appearance Map Content Reorg Plan

## Goal

Reduce the Appearance panel's nesting by moving map-content controls into a new sibling section under Appearance while preserving existing control ids, event bindings, and visual card styles.

## Acceptance

- Appearance keeps Borders, Transport, Presets, plus top-level Physical Regions, Urban Areas, and City Points cards.
- Context Layers is removed as a visible panel and tab.
- A new Map Content section appears below Appearance.
- Map Content contains the existing Ocean, Day / Night, Texture, and Rivers controls.
- Existing ids and owner bindings remain unchanged.
- Source and dist stay in sync.

## Steps

- [x] Inspect current Appearance DOM, CSS scopes, and tests.
- [x] Move the relevant DOM groups with minimal id/class changes.
- [x] Update CSS scopes for the new containers.
- [x] Update static UI contracts.
- [x] Rebuild dist and run targeted verification.
- [x] Review for simpler implementation and archive this task folder.
