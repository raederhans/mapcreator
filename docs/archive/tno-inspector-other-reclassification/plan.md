# TNO inspector Other reclassification

## Goal

- Move XIK from the fallback Other inspector group into the China Region group.
- Move the remaining top-level TNO Russian splinter tags currently shown in Other into the Russia Region group.
- Keep the fallback Other group available only for countries that still have no scenario grouping metadata.

## Steps

- [x] Confirm current grouping source and affected tags.
- [x] Patch TNO country metadata and existing inspector group regression tests.
- [x] Rebuild startup bundles and sync Pages dist.
- [x] Run targeted tests, dist verification, and browser smoke.
- [x] Record any durable lesson only if the task reveals a new reusable rule.

## Live Process Ownership

- Main agent owns all data rebuilds, test commands, and browser smoke checks.
- Review subagent is read-only and may inspect files only.
