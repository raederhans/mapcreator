# Landing User Copy Cleanup Task

## Current Step
Implementation and verification complete. Remaining work is git integration into `main`, push, and worktree cleanup.

## Verification Commands
- `npm run verify:pages-dist`
- Targeted static scan for stale homepage phrases in `landing/index.html`, `landing/app.js`, `dist/index.html`, and `dist/app.js`

## Notes
- Keep data-source links intact.
- Keep transport counts intact where they are useful to users.
- Keep source/dist parity.
