# Context

User reports Territories & Presets stays empty when only map land features are selected. Need infer country from selected tiles; multiple countries need explicit behavior.

## Completed 2026-05-29

- Preset tree now keeps explicit inspector country selection as the primary source.
- When no inspector country is selected, selected land feature ids are read from dev selection order or the active selected land hit.
- The feature owner is resolved from sovereignty state first, then feature identity.
- A single inferred country opens the Territories & Presets panel for that country.
- Multiple inferred countries show a localized ambiguity message asking the user to narrow the selection or choose a country in the inspector.
- Dist was rebuilt and targeted source/dist checks passed.
