## Project Download Save Dialog Plan

Task: fix Project Management download so the primary path opens a save dialog and writes the selected JSON or ZIP file.

Acceptance criteria:
- [x] Download Project uses the selected project format and opens the save-file path by default.
- [x] JSON and ZIP save picker options use matching file extensions and MIME types.
- [x] Export cancellation keeps dirty state unchanged and reports cancellation in the sidebar.
- [x] Source, dist, and focused project export tests pass.

Steps:
- [x] Locate current Project Management download path and tests.
- [x] Patch file export options and Project Management default destination.
- [x] Add focused regression coverage for picker options and default destination.
- [x] Run source/dist verification and browser-level smoke where useful.
- [x] Archive this task folder after completion.

Verification:
- `npm run verify:pages-dist`
- `node --test tests\file_manager_project_roundtrip_behavior.test.mjs tests\project_support_diagnostics_controller_behavior.test.mjs`
- `python -m unittest tests.test_project_support_diagnostics_sidebar_boundary_contract tests.test_ui_rework_plan02_mainline_contract -q`
- `node --check` on source and dist project export modules.
- Browser smoke on `localhost:8000/app` confirmed JSON and ZIP save picker calls write real blobs.
