# Backend Community Framework Context

## 2026-05-29
- Created isolated worktree from `origin/main` at `C:\Users\raede\Desktop\dev\mapcreator-backend-framework`.
- Local mapper confirmed `tools/dev_server.py` is the server entry and project support controller owns project import/export binding.
- Research lane recommended a same-origin local BFF/API, SQLite metadata, HttpOnly session cookies, object-level authorization, and explicit community moderation/report state.
- Implementation will keep existing local JSON import/export unchanged and add optional cloud/community controls.
- Recovered from an apply surface mistake by removing the backend patch from the main checkout and applying it to this worktree.

## Progress
- [x] Worktree created.
- [x] External research collected.
- [x] Local touchpoints mapped.
- [x] Backend package implemented.
- [x] Dev server route integration implemented.
- [x] Frontend limited integration implemented.
- [ ] Verification complete.

## Implementation notes
- Added `map_backend` with separate security, SQLite store, file storage, service, and route adapter modules.
- Backend save payloads are written under `.runtime/backend/saves/`; SQLite stores metadata, sessions, comments, and reports.
- Added `FileManager.buildProjectPayload()` so cloud save can reuse export schema without triggering a browser download.
- Project panel now has Cloud Saves controls wired through `js/api/backend_client.js`.
- Review fixes:
  - Corrupt or missing saved project files now return structured `save_payload_unavailable`.
  - Backend GET routes now require the same dev-token/same-origin boundary as other dev server APIs.
  - Community load status waits for the import completion/error callback.
  - Publish Latest can recover the newest saved cloud project through `GET /api/backend/saves`.

## Verification
- Passed backend unit tests and route tests.
- Passed project support controller behavior and boundary tests.
- Passed FileManager project roundtrip tests.
- Passed JS syntax checks for touched frontend files.
- Passed Python compileall for backend/dev-server/test files.
- Passed `git diff --check`.
- Passed a real local HTTP smoke covering register, save, publish, community list, and download.
