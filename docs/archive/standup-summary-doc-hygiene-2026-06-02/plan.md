# Standup Summary Doc Hygiene Plan

## Acceptance

- [x] `lessons learned.md` keeps recurring cross-task rules and drops resolved narrow items.
- [x] Empty `docs/active` remnants are removed.
- [x] Old doc cleanup only touches items with safe archive/reference status.
- [x] This task folder is archived after verification.

## Steps

- [x] Inspect current `lessons learned.md`, `docs/active`, and candidate old docs.
- [x] Patch `lessons learned.md` with the smallest safe dedupe/removal set.
- [x] Remove safe empty active remnants.
- [x] Run reference and diff checks.
- [x] Archive this task folder.

## Verification

- `git diff --check -- "lessons learned.md" docs`
- targeted `rg -n --fixed-strings` follow-up checks for `project-download-save-dialog` and `project-package-options` under `docs/`
