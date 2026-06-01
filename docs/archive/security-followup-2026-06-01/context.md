# Security Follow-up Context

## 2026-06-01
- Worktree: C:\Users\raede\.codex\worktrees\mapcreator-security-followup-20260601
- Base: origin/main at 330aca5a.
- Main checkout has unrelated dirty files and remains untouched.
- Main thread owns live tests and build commands.

## Findings
- Legacy dirty `imageUrl` sanitization was implemented at `_save_payload`, but the regression test only asserted owner detail and community list. The code path covers more payload exits, so the test now locks owner list, community detail, community download, and admin detail too.
- The archived security-audit plan still showed the archive step unchecked after the folder had been moved into `docs/archive`. The checklist now reflects the completed state.
- `dist/pages-dist-manifest.json` recorded `app/js/api/backend_client.js` as 5742 bytes while the current Windows checkout file size was 5752 bytes. `npm run verify:pages-dist` regenerated the manifest and proved the Pages startup shell contract.
- The image URL allowlist rejected valid loopback URLs such as `http://[::1]:8000/...` and `http://localhost./...`. It now accepts loopback IPs through `ip_address(...).is_loopback` and normalizes a trailing dot on `localhost`.
- Percent-encoded dangerous characters such as `%0A`, `%5C`, and `%28` could pass the raw character check. URL authority, paths, queries, fragments, and local paths are now decoded before the dangerous-character check.

## Verification
- `python -m unittest tests.test_backend_service tests.test_backend_routes -q`: passed, 25 tests.
- `npm run verify:pages-dist`: passed, dist build plus 13 Pages startup shell tests.
- Manifest size check: `app/js/api/backend_client.js` actual size 5752, manifest size 5752.
- Userinfo reproducer check: `%0A@127.0.0.1`, `%5C@127.0.0.1`, and `%28@127.0.0.1` returned `False`; `[::1]` and `localhost.` returned `True`.
- `node --test tests/backend_client_behavior.test.mjs`: passed, 7 tests.
- Targeted `tests.test_dev_server.DevServerTest` same-origin/dev-token/body/cookie tests: passed, 10 tests.
- `python -m unittest tests.test_pages_dist_startup_shell -q`: passed, 13 tests.
- `git diff --check`: passed.
