# Plan

1. Map current transport registry, preview loaders, manifests, overlay renderer, state persistence, and tests.
2. Add a source-gated target pack registry for the 9 Phase B packs.
3. Add active pack resolver and make workbench preview/Apply use activePackId as the single pack entrypoint.
4. Extend target manifests and runtime aliases to satisfy main-map bridge contracts.
5. Add independent country overlay state and renderer support for country road, rail, and airport overlays.
6. Wire project export/import/restore, stale pack cleanup, and pack switching cleanup.
7. Extend existing contract/unit tests and add one minimal browser smoke for Germany road, France rail, and USA airport.
8. Run review/deslop, fix findings, run final verification, then archive docs and merge back to main.

Status: all steps complete. The archive folder records final verification and merge intent.
