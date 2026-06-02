# Project package options context

## 2026-06-02

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-project-package-options`
- Branch: `codex/project-package-options`
- Main checkout has unrelated dirty files; implementation stays isolated here.
- Current project ZIP contains only `map_project.json` and `map_project_manifest.json`.
- Current ZIP import unwrapping lives in `js/ui/sidebar/project_support_diagnostics_controller.js`.
- Export artifact packages already normalize paths and write manifest/checksum metadata in `js/core/export_artifact_package.js`.
- Implemented project package IO in `js/core/project_package_io.js`; it writes `manifest.json`, root compatibility `map_project.json`, canonical `project/map_project.json`, and optional metadata/resource/diagnostic directories.
- ZIP imports are prepared by project package IO before entering the normal project import funnel; ZIP previews are shown by the project sidebar controller.
- Verification passed: `node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/project_support_diagnostics_controller_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs`.
- Reviewer findings fixed: manifest/project mismatch is rejected, checksum mismatch is rejected, resource index only references included files, and ZIP preview cancellation clears the file input.
- Verification passed after reviewer fixes: `node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/project_support_diagnostics_controller_behavior.test.mjs tests/export_workbench_state_behavior.test.mjs`; `python -m unittest tests.test_project_support_diagnostics_sidebar_boundary_contract -q`; `npm run verify:pages-dist`.

## Current owner map

- Main agent: implementation, edits, tests, final review, live process ownership.
- Static subagent: code boundary mapping only; no file changes and no live process monitoring.
- Reviewer subagent: static post-change review; no file changes and no live process monitoring.
