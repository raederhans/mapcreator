# Landing Home Revamp Task

## Current status

Integration worktree established from current `origin/main`; three bounded user-visible workstreams and two internal read-only review lanes are active.

## Checklist

- [x] Preserve parent WIP and choose exact current base.
- [x] Create isolated integration branch/worktree.
- [x] Record goal, scope, acceptance and live-process ownership.
- [x] Dispatch content/IA workstream.
- [x] Dispatch map correctness/interaction workstream.
- [x] Dispatch responsive/visual polish workstream.
- [ ] Integrate content candidate.
- [ ] Integrate map/interaction candidate.
- [ ] Integrate visual/responsive candidate.
- [ ] Update focused tests and canonical generated assets.
- [ ] Run target contracts and browser acceptance.
- [ ] Complete final review and delivery package.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git rev-parse origin/main` | `f118a101d30373c507075da32267969b22197338` |
| Parent `git diff --name-only -- landing` | clean at dispatch |
| `npm run test:node:landing-showcase-view` | baseline PASS, 18/18 |
| `npm run test:node:sample-project-contracts` | baseline PASS, 18/18; expected hostile-import diagnostics remain on stderr |

## Open risks and remaining work

- Map visual correctness needs exact-data and generator review before regeneration.
- Shared landing source files require sequential integration.
- The existing worktree registry is stale relative to live topology and will be updated with the final task-owned rows without rewriting unrelated history.
