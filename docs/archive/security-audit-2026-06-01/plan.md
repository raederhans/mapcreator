# Local Security Audit Plan

## Goal
- Audit the local-first app/backend security surface for the dev server, Cloud Saves, community/admin backend, and import/export paths.
- Confirm reachable findings before fixing.
- Keep fixes minimal and tied to targeted regression tests.

## Scope
- Backend: `tools/dev_server.py`, `map_backend/routes.py`, `map_backend/service.py`, `map_backend/security.py`, `map_backend/storage.py`, `map_backend/store.py`.
- Frontend: `js/api/backend_client.js`, `backend/app.js`, `js/ui/sidebar/project_support_diagnostics_controller.js`, `js/core/file_manager.js`, `js/core/interaction_funnel.js`.
- Delivery: sync source changes into `dist/app` when source JS changes.

## Task List
- [x] Create clean worktree from latest `origin/main`.
- [x] Run known green baseline checks.
- [x] Map backend and frontend attack surfaces.
- [x] Validate concrete findings with focused repros.
- [x] Apply minimal fixes for confirmed findings.
- [x] Run targeted and delivery verification.
- [x] Run final review self-check.
- [ ] Archive this task folder after commit and push.

## Acceptance Criteria
- Confirmed findings have a trigger path, fix point, and verification command.
- `node --test tests/backend_client_behavior.test.mjs` passes.
- `python -m unittest tests.test_backend_service tests.test_backend_routes -q` passes.
- Relevant dev server security tests pass.
- `verify:pages-dist` runs if `dist/app` changes.
- Final report lists fixed findings, observed risks, and known baseline failures.
