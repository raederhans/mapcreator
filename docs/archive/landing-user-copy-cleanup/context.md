# Landing User Copy Cleanup Context

## 2026-06-06
- User selected the Japan product preview paragraph and asked to remove plain explanatory/developer-style text across the page.
- Main checkout was clean relative to `origin/main` except for unrelated `.omx/metrics.json`.
- Created worktree: `C:\Users\raede\Desktop\dev\mapcreator-landing-user-copy-cleanup`
- Branch: `codex/landing-user-copy-cleanup`
- Sidecar `019e9dd9-f457-7472-8226-4e33ac12d392` completed read-only review and flagged homepage phrases involving checked-in manifests, ledgers, build audits, source claims, and 入库 wording.
- Main agent owns all edits, build, dist sync, and git integration.
- Rewrote user-visible landing copy in `landing/index.html` and `landing/app.js`.
- Added `test_landing_copy_stays_user_facing` to prevent the old developer-facing homepage phrases from returning in source or dist.
- `npm run verify:pages-dist` passed and refreshed `dist`.
- Manifest size refresh was checked against disk: 9322 records, 0 mismatches, computed total matched recorded `total_bytes`.
- Read-only review agent found no blocking issues and confirmed the new test is scoped to landing source/dist files.
