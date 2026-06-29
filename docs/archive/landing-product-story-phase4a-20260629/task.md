# Phase 4A Task

## Acceptance Checklist

- [x] Landing has a coherent interactive story from baseline to export-ready map.
- [x] Story uses existing checked-in assets and metadata.
- [x] Story is bilingual English/Simplified Chinese.
- [x] Story controls work by click and keyboard.
- [x] Reduced-motion path does not depend on animation.
- [x] Pages dist stays below 950 MiB preferred target and 1 GiB hard cap.
- [x] No editor runtime behavior or scenario runtime data changes.
- [x] Tests cover story behavior and evidence markers.

## Validation Commands

- [x] `npm run verify:pages-dist` - passed; final dist total `926.93 MiB`; Python 41/41; landing Node 13/13.
- [x] `npm run test:node:landing-showcase-view` - passed 13/13.
- [x] `py -3 -m unittest tests.test_pages_dist_startup_shell -q` - passed 41/41.
- [x] `git diff --check` - passed with CRLF warnings only.

## Remaining Closeout

- [ ] Stage files and run `npm run verify:dist-drift`.
- [ ] Commit with Lore protocol.
- [ ] Rebase or fast-forward against latest `origin/main`, then push/integrate.
