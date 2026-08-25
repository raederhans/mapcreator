# Landing Home Revamp Task

## Current status

Implementation, canonical regeneration, responsive browser acceptance and focused review are complete on the isolated integration branch. The parent checkout remains untouched; no push or deployment was performed.

## Checklist

- [x] Preserve parent WIP and choose exact current base.
- [x] Create isolated integration branch/worktree.
- [x] Record goal, scope, acceptance and live-process ownership.
- [x] Dispatch content/IA workstream.
- [x] Dispatch map correctness/interaction workstream.
- [x] Dispatch responsive/visual polish workstream.
- [x] Integrate content candidate.
- [x] Integrate map/interaction candidate.
- [x] Integrate visual/responsive candidate.
- [x] Update focused tests and canonical generated assets.
- [x] Run target contracts and browser acceptance.
- [x] Complete final review and delivery package.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git rev-parse origin/main` | `f118a101d30373c507075da32267969b22197338` |
| Parent `git diff --name-only -- landing` | clean at dispatch |
| `npm run test:node:landing-showcase-view` | baseline PASS, 18/18 |
| `npm run test:node:sample-project-contracts` | baseline PASS, 18/18; expected hostile-import diagnostics remain on stderr |
| `npm run python -- -m unittest tests.test_landing_map_asset_contracts -q` | final PASS, 10/10 in 148.049s |
| `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q` | final PASS, 62/62 after final Pages rebuild |
| `npm run test:node:landing-showcase-view` | final PASS, 20/20 |
| `npm run test:node:sample-project-contracts` | final PASS, 18/18; expected hostile-import diagnostics remain on stderr |
| Verification route checks | 6/6 focused contracts PASS; 379 routes PASS; script portfolio complete |
| Desktop/tablet/mobile browser acceptance | PASS at desktop, 1024, 768 and approximately 390 CSS px; no page overflow, failed images, console warnings or console errors |
| Map interaction acceptance | PASS for Hero modes, sample filters, story compare, Europe/Japan tabs, keyboard zoom/reset and drag/pan |
| Local HTTP requests | all observed asset requests returned 200/304; server stopped after acceptance |

## Remaining boundary

- Remote CI, push, deployment and public-host verification were intentionally not performed.
- The full editor/runtime product was not redesigned; this task only changes the independent static showcase and its evidence/asset contracts.
