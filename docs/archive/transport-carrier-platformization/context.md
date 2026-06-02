# Transport Carrier Platformization Context

## 2026-06-02

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-transport-carrier-platformization`
- Branch: `codex/transport-carrier-platformization`
- Main checkout has unrelated dirty files; this worktree starts clean.
- Existing bug: `js/ui/transport_workbench_carrier.js` loaded `transport_carrier:japan_corridor` unconditionally, so non-Japan packs rendered against Japan carrier/projection.
- User scope update: carrier scope must match data coverage, with USA CONUS/Alaska/Hawaii included, UK/France overseas excluded, and Russia including Kaliningrad.
- Implemented `transport_carrier:usa`, `:germany`, `:uk`, `:france`, `:china`, `:india`, and `:russia` carrier assets under `data/transport_layers/*_carrier/`.
- `carrier.json` is compact JSON to keep Pages size below the existing 995 MiB gate while preserving geometry precision.
- Road/rail/point preview projection now prepares the manifest carrier before projecting features. Point preview no longer maps non-Japan points through `clip_bbox` into the Japan frame.
- Catalog count is now 480 entries; transport manifest count is now 105.
- Live process owner: main thread.
