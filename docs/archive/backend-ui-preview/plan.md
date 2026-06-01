# Backend UI Preview Plan

## Goal
Build a local backend preview at `/backend/` with three separated surfaces:
- Public community: anonymous visitors can browse published saves, read sample posts, view details, download shared saves, and see comment/report affordances.
- User center: logged-in users manage only their own saves, drafts, publish/export actions, and cover image metadata.
- Admin backend: staff users manage community activity, posts, comments, images, reports, users, bans, and roles.

## Completed Tasks
- [x] Created isolated worktree from `origin/main`.
- [x] Split the UI into community, user center, and admin backend views.
- [x] Moved login/register into a modal auth flow, separate from community and admin management.
- [x] Added admin/staff backend endpoints for overview, reports, content visibility, comment locks, image management, user status, user roles, and demo content seeding.
- [x] Tightened save detail/export permissions so public sharing uses the community allowlist and owner routes stay owner-only.
- [x] Added staff-only save detail preview for admin moderation workflows.
- [x] Split admin-only demo seed/user-management controls away from community and moderator views.
- [x] Added frontend client methods for save detail/export, community detail, and admin actions.
- [x] Added Chinese default UI and English toggle.
- [x] Added startup script and npm verification entry.
- [x] Added focused Python and Node tests.
- [x] Ran HTTP and browser smoke against the local preview.

## Review URL
- `http://127.0.0.1:8032/backend/`

## Verification
- `npm run verify:backend-preview`: passed, 22 Python service/route tests plus 6 Node client tests.
- `python -m unittest tests.test_backend_service tests.test_backend_routes -q`: passed, 22 tests.
- `node --test tests/backend_client_behavior.test.mjs`: passed.
- `python -m unittest tests.test_dev_server.DevServerTest.test_backend_console_exposes_chinese_default_and_language_toggle tests.test_dev_server.DevServerTest.test_resolve_static_request_path_serves_backend_console -q`: passed.
- `node --check backend/app.js; node --check js/api/backend_client.js`: passed.
- HTTP smoke: register/login admin, seed 3 demo posts, comment, report, close comments, admin private preview, review report, reject stranger owner-route detail/export, community allowlist download.
- Browser smoke: admin login, admin content tab, community seed button absent, hidden auth buttons after login, screenshot under `.runtime/browser/backend-preview/backend-redesign-admin-fixed.png`.
