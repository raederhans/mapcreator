# transport-data-rollout plan

## Goal

Load real, source-traceable transport workbench data for the main country set and verify that each workbench panel can load, render, and interact with its active pack in the app.

## Ordered Steps

1. Road country packs.
2. Airport country packs.
3. Rail country packs.
4. Port country packs.
5. Energy, mineral, industrial, and logistics packs.
6. Registry, catalog, dist, app interaction, and final review.

## Current Scope

- Main countries: Japan, Germany, United Kingdom, France, United States, China, India, Russia.
- Existing packs kept and rebuilt: Japan road/rail/airport/port/facility packs, Germany/UK road, France rail, USA/China/Russia/India airports.
- New packs in this rollout: USA road, Germany rail, Germany/France/UK airports, multi-country UN/LOCODE ports, Germany DLM250 facility packs.

## Execution Rules

- Main thread owns live downloads, builders, tests, dev server, and browser verification.
- Subagents handle source research and static code mapping only unless assigned a disjoint edit scope.
- Every generated pack must have source cache signatures, source recipe, build audit, manifest, registry entry, catalog entry, and app load path.
