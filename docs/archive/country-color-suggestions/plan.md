# Country Color Suggestions

## Goal
- Fix the Chinese label for the compact country color control.
- Add a compact dropdown that suggests colors by matching the selected country against palette-library country names across all registered palettes.
- Keep selection scoped to the current visual/action color, with no automatic map repaint unless the existing action flow is triggered.

## Acceptance
- The selected country can receive suggestions from any registered palette, including inactive palettes.
- The dropdown stays compact in the existing inspector row.
- Source and dist stay synchronized.
- Targeted JS/Python checks pass.
