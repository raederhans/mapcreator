# Transport Data Rollout Task State

## Done

- Isolated worktree created.
- OMX/autoresearch scaffolding started.
- Active task log recreated inside the current worktree.
- Existing source cache copied into the worktree.
- Source route research completed for road, airport, rail, and port.
- Runtime/code path mapping completed.

## In Progress

- Reverify existing source cache and existing country pack rebuild.
- Patch source contracts and builders for the next country packs.

## Next

1. Re-run existing source gate.
2. Rebuild existing real-source country packs.
3. Add first expansion wave: `usa_road`, `france_road`, `germany_airport`, and `germany_rail`.
4. Register new manifests in runtime assets, catalog, and dist.
5. Expand tests and run targeted verification.
6. Repeat for the remaining rollout steps until all required panels load and interact correctly.

## Open Risks

- Some official sources require credentials, token access, manual download, or unclear redistribution terms.
- Large OSM/Geofabrik extracts can be too heavy for checked-in full-country packs; builders may need strict class filters and compact previews.
- `port` and facility workbench families need active pack switching support before country packs can be user-selectable.
