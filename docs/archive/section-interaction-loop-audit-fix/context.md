# Section Interaction Loop Audit Fix Context

## 2026-05-25

- Clean review worktree: `C:\Users\raede\Desktop\dev\mapcreator-section-audit-2026-05-25`.
- Scope: latest `origin/main` commit `c89e7e6`, especially project import/export status observers and per-section status loops.
- Finding: `FileManager.importProject` treated a status observer exception as a failed project import because the observer ran inside the main import try/catch.
- Fix target: isolate optional observer failures from import success/error classification and cover it with a regression test.
- Finding: `projectSaveStatus` only refreshed on import/export UI paths, so ordinary `markDirty` edits could leave Project Management showing stale save guidance.
- Fix target: connect the status refresh to the dirty-state update hook and cover dirty/clear transitions with a controller behavior test.
- Finding: Strategic status used a live region and rewrote the same text during unrelated refreshes.
- Fix target: only write `textContent`, `title`, and `aria-label` when their computed values change.
- Verification: syntax checks, targeted Node behavior tests, Python sidebar/transport contracts, i18n audit, and `git diff --check` passed.
