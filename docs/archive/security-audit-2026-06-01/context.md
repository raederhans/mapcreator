# Local Security Audit Context

## 2026-06-01
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-security-audit-20260601`.
- Branch: `codex/security-audit-20260601`.
- Base: `origin/main@cec22d94`.
- Main checkout has unrelated dirty files and remains untouched.
- Live process ownership: main thread owns tests, dev server, and any browser smoke. Subagents are read-only unless reassigned.

## Baseline
- `node --test tests/backend_client_behavior.test.mjs`: passed, 7 tests.
- `python -m unittest tests.test_backend_service tests.test_backend_routes -q`: passed, 22 tests.
- Prior planning run observed `tests.test_dev_server` full suite has an existing TNO diagnostics checked-in contract failure. This task uses targeted dev server security tests.

## Findings Under Validation
- `backend/app.js` imports `isLocalBackendRuntimeAvailable` from `js/api/backend_client.js`, but the client module currently does not export it. Repro: `node --input-type=module -e "import('./backend/app.js').catch(...)"` fails at module import.
- `map_backend.service.BackendService._normalize_image_url` accepts local paths by raw `/` prefix and localhost URLs by raw string prefix. This allows protocol-relative external URLs such as `//evil.example/pixel` and misleading hostnames such as `http://localhost.evil.example/pixel`.

## Fixed Findings
- Frontend local backend runtime probe export mismatch.
  - Trigger: importing `backend/app.js` failed because `js/api/backend_client.js` did not export `isLocalBackendRuntimeAvailable`.
  - Fix point: add the exported local HTTP runtime check in `js/api/backend_client.js` and sync `dist/app/js/api/backend_client.js`.
  - Verification: `node --check backend/app.js`; backend app import smoke prints `backend app module import ok`; `node --test tests/backend_client_behavior.test.mjs`.
- Community/admin image URL boundary.
  - Trigger: save/community image URL accepted protocol-relative external URLs, localhost-prefix spoofing, invalid port spoofing, and CSS breakout characters before persisting to SQLite and rendering in `backend/app.js`.
  - Fix point: parse URLs in `map_backend/service.py`, allow only local paths or `http(s)` URLs whose parsed host is `localhost` or `127.0.0.1`, reject invalid ports or style-breaking characters, and clear invalid legacy values from API payloads.
  - Verification: `tests/test_backend_service.py::BackendServiceTest.test_image_url_rejects_external_or_css_breakout_urls`, `tests/test_backend_service.py::BackendServiceTest.test_legacy_invalid_image_url_is_hidden_from_payloads`, and route-level `invalid_image_url` assertions through `python -m unittest tests.test_backend_service tests.test_backend_routes -q`.
- Last active admin lifecycle.
  - Trigger: the only active admin could demote itself, then schema bootstrap on a later DB connection could restore admin status.
  - Fix point: `admin_update_user` rejects and rolls back updates that would leave zero active admins after the write.
  - Verification: `tests/test_backend_service.py::BackendServiceTest.test_admin_cannot_remove_last_active_admin` and route-level `cannot_remove_last_admin` assertions through `python -m unittest tests.test_backend_service tests.test_backend_routes -q`.

## Observed Risks
- Dev token is a browser CSRF/local UI boundary, not a boundary against arbitrary local processes. A local process can fetch static content and receive the cookie. This stays in the final risk list for a stronger threat model that treats other local processes as untrusted.
- Full `tests.test_dev_server` still has the pre-existing TNO diagnostics checked-in contract failure noted in planning. Security targeted dev server tests passed.

## Verification
- `node --test tests/backend_client_behavior.test.mjs`: passed, 7 tests.
- `python -m unittest tests.test_backend_service tests.test_backend_routes -q`: passed, 25 tests.
- Targeted `tests.test_dev_server.DevServerTest` same-origin/dev-token/body/cookie tests: passed, 10 tests.
- `node --check js/api/backend_client.js; node --check backend/app.js; node --check dist/app/js/api/backend_client.js`: passed.
- Backend app import smoke: passed, printed `backend app module import ok`.
- `npm run verify:pages-dist`: passed, build completed and startup shell ran 13 tests.
