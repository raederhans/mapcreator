# Backend Community Framework Plan

## 1. Scope
- Add a local backend package with auth, sessions, save storage, publish/community, comments, reports, and export payloads.
- Integrate the package into the existing Python dev server under `/api/backend/*`.
- Add a light project panel connection so users can register/login, save current project state, publish it, browse community saves, and load/download a community save.

## 2. Boundaries
- Keep existing local JSON import/export as the source-compatible user workflow.
- Store backend runtime data under `.runtime/backend/`.
- Do not add external dependencies.
- Do not move existing project import/export ownership out of the project support controller.
- Main thread owns all live tests and server runs.

## 3. Execution Tasks
- [x] Create backend storage/security/service/router modules.
- [x] Add backend API route dispatch to `tools/dev_server.py`.
- [x] Add frontend backend client and project panel controls.
- [x] Add targeted backend, dev server, and frontend contract tests.
- [x] Run verification and fix bugs.
- [x] Final review and update lessons.
- [ ] Archive docs, commit, push, merge, cleanup worktree.

## 4. External Sources Used
- OWASP Session Management, CSRF, Authorization, File Upload, Password Storage cheat sheets.
- MDN secure cookie guidance.
- Python `sqlite3` official docs.
- Python `http.server` production warning.
- SQLite official appropriate-use guidance.
- GitHub and Mozilla community reporting/moderation docs.
- RFC 9110 HTTP semantics.
- IETF OAuth browser-based apps draft and RFC 9700 for future OAuth direction.

## 5. Live Process Ownership
- Current owner: main thread.
- Logs: `.runtime/tests/backend-community-framework/` when long commands are needed.
- Other agents may read static files and completed outputs only.

## 6. Verification
- `python -m unittest discover -s tests -p 'test_backend*.py' -q`
- `python -m unittest tests.test_dev_server.DevServerTest.test_do_get_dispatches_backend_api_as_json tests.test_dev_server.DevServerTest.test_do_get_rejects_backend_api_without_dev_token -q`
- `python -m unittest tests.test_project_support_diagnostics_sidebar_boundary_contract -q`
- `node --test tests/project_support_diagnostics_controller_behavior.test.mjs`
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`
- `node --check js/api/backend_client.js; node --check js/core/file_manager.js; node --check js/ui/sidebar.js; node --check js/ui/sidebar/project_support_diagnostics_controller.js`
- `python -m compileall -q map_backend tools/dev_server.py tests/test_backend_service.py tests/test_backend_routes.py`
- `git diff --check`
- HTTP smoke against `python tools/dev_server.py /app/ --port 8029`
