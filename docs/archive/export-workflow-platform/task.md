# Export Workflow Platform Task

## Current Checklist

- [x] Add ZIP dependency and scoped artifact helper.
- [x] Add manifest builder with stable file metadata.
- [x] Convert per-layer export to ZIP artifact.
- [x] Convert bake-pack export to ZIP artifact.
- [x] Add Project JSON handoff metadata.
- [x] Align scenario publish metadata.
- [x] Update copy and i18n catalog.
- [x] Sync `dist/app`.
- [x] Run final review and prepare merge/push/cleanup.

## Notes

- Keep implementation short and modular.
- Prefer extending existing tests before creating new test systems.
- Preserve current composite image download behavior unless adding an optional packaged path is small and safe.
