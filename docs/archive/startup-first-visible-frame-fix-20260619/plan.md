# Startup First Visible Frame Fix Plan

## Goal

Fix the startup block where `bootstrap-first-political-frame` rejects the first visible political frame with `stale-political-full-reference-transform`.

## Acceptance

- The startup first visible frame gate accepts a current coarse/progressive political frame.
- Fine partial repaint still requires a fine same-scene baseline and full reference transform.
- Source and `dist/app` runtime files stay synchronized.
- Targeted renderer/startup contracts pass.

## Steps

- [x] Reproduce and map the blocking condition.
- [x] Patch the first-visible-frame gate with the smallest safe condition.
- [x] Update focused contract coverage.
- [x] Sync delivery surface.
- [x] Run targeted verification.
- [x] Review the patch and archive this task.
