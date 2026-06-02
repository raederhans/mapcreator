# Ocean Splits 2026-06-02 Context

## Starting Point

The previous Scotia Sea pass removed the last low-precision macro sea. This phase starts from current main and focuses on the remaining source replacement candidates plus high-precision macro seas that may need child-water splits.

## Live Process Ownership

The main agent owns all live validation commands. Subagents may do static analysis and source research only.

## Current Phase Result

- `tno_weddell_sea` moved from `tno_cloned_from_global_water_regions` to Marine Regions SeaVoX `mrgid_sr='24035'`.
- `tno_hudson_strait` was added as a source-backed `marine_detail` child of `tno_hudson_bay` using Marine Regions SeaVoX `mrgid_sr='24017'`.
- `tno_hudson_bay` now subtracts `tno_hudson_strait` to keep the macro/detail surfaces separated.
- Post-sync audit reports source replacement candidates = 6 and high-precision split candidates = 3.

## External Source Evidence

- Weddell Sea SeaVoX detail: `https://www.marineregions.org/gazetteer.php?id=24035&p=details`.
- Hudson Strait SeaVoX detail: `https://www.marineregions.org/gazetteer.php?id=24017&p=details`.
- WFS endpoint: `https://geo.vliz.be/geoserver/MarineRegions/wfs`.

## Build Notes

- Full changed-domain rebuild failed in the fresh worktree because countries checkpoints were absent.
- Countries stage then failed because the external `historic geographic overhaul` donor root was absent in this worktree.
- Scoped sync script `.runtime/tmp/sync_ocean_splits.py` was used as a disposable TTL script and should remain untracked.

## Closeout

- Branch commit: `11e223a2` (`Split Hudson Strait and source Weddell Sea`).
- Merged into main after confirming the newer main commits touched transport/project surfaces and did not overlap the ocean data files.
- Final external actions after archive update: run post-merge validation, push main, deactivate ultrawork, remove the temporary worktree.
