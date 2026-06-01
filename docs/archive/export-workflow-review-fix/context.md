# Export Workflow Review Fix Context

## 2026-06-01

- Worktree: `C:\Users\raede\.codex\worktrees\export-workflow-review-fix`.
- Branch: `codex/export-workflow-review-fix`, based on `origin/main` at `b7fbb57b`.
- Review scope: latest commit `b7fbb57b Make map exports traceable artifacts`.
- Main checkout had unrelated dirty files before work started; all edits happen in this worktree.
- Live process owner: main thread only.
- Independent lanes: code-reviewer and architect review latest commit; they must not run live tests or edit files.

## Findings

- Code review found three actionable issues in `b7fbb57b`:
  - Project JSON `exportHandoff` used placeholder `byteLength: 0` and `checksum: "created-at-download"` for `map_project.json`.
  - Browser ZIP artifact checksum used FNV-1a while Python publish metadata used `sha256_`.
  - Payload file path `manifest.json` could silently overwrite the generated manifest entry.
- Architect review status: WATCH. Boundary is acceptable for this fix; the main follow-up risk was dual fflate sources, so this branch removes the npm dependency and keeps the vendored browser ESM file as the single runtime source.
- Fixes:
  - Added `normalizeManifestFileEntry()` so manifest raw file entries are cleaned consistently.
  - Removed unknown Project JSON self-file byte length/checksum metadata.
  - Browser artifact files now use `sha256_<hex>` from Web Crypto.
  - `buildExportArtifactPackage()` rejects payload paths that collide with the reserved manifest path.
  - Removed `fflate` from `package.json` and `package-lock.json`; source continues to import `vendor/fflate.browser.js`.

## Validation

- `node --check js/core/export_artifact_package.js js/core/file_manager.js js/ui/toolbar.js js/ui/toolbar/export_workbench_controller.js`
- `npm run test:node:annotation-productization`
- `python -m unittest tests.test_scenario_build_session tests.test_publish_scenario_outputs tests.test_scenario_bundle_publish_service -q`
- `python tools/i18n_audit.py`
- `npm run verify:pages-dist`
- `git diff --check`
