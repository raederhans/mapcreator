# Landing Home Revamp Context

## Current truth

- Integration worktree: `C:\Users\raede\.codex\worktrees\landing-home-revamp-integration-20260825\mapcreator`.
- Integration branch: `codex/landing-home-revamp-integration-20260825`.
- Exact base: `origin/main@f118a101d30373c507075da32267969b22197338`.
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` on `codex/preserved-main-wip-20260823@9869698d`, with unrelated WIP preserved.
- The parent audit found no missing local landing assets or incorrect tested numeric values; it did find a license-answer defect, misleading scope language, repeated sections, map-composition issues and mobile interaction loss.
- `origin/main` updates the audited catalog count from 658 to 659; all workstreams must use the exact current base rather than the stale parent value.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-08-25 | Use `origin/main@f118a101` as the common implementation base. | Preserves the dirty parent and includes the current 659-asset catalog truth. |
| 2026-08-25 | Parallelize content, map correctness and visual CSS by file ownership; integrate shared hotspots serially. | Prevents concurrent edits from being treated as merge-ready merely because they are in separate worktrees. |
| 2026-08-25 | Keep the homepage static and use existing generators/assets. | No CMS, new framework or runtime data platform. |
| 2026-08-25 | Preserve the dark cartographic/teal-gold identity and reduce card chrome around a map-first evidence narrative. | Visual work refines the existing language instead of replacing it. |

## Workstream topology

| Workstream | User-visible task | Worktree | Ownership | State |
| --- | --- | --- | --- | --- |
| Content and IA | `01a0379c-1e22-7d00-85ea-af0bf0e314ff` | `C:\Users\raede\.codex\worktrees\d189\mapcreator` | `landing/index.html`; copy/translation constants in `landing/app.js` | active |
| Map correctness and assets | `01a0379c-1e6b-72d0-a218-a382bb90098c` | `C:\Users\raede\.codex\worktrees\0531\mapcreator` | canonical landing generators, generated map assets and focused asset contracts | active |
| Responsive and visual quality | `01a0379c-1e65-7a70-9556-747550d575ff` | `C:\Users\raede\.codex\worktrees\b120\mapcreator` | `landing/styles.css` | active |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| Dev server / browser acceptance | Primary integration task | `.runtime/browser/landing-home-revamp/` | not started |
| Landing asset generators | Primary integration task | `.runtime/reports/generated/landing-home-revamp/` | not started |
| Pages dist builder | Primary integration task | project-standard output | deferred until accepted source candidate |

## Handoff

- Workstream tasks must return changed-file ownership, diff summary, verification evidence and unresolved visual/data risks.
- They must not push, merge, clean worktrees, run a dev server/browser, or regenerate shared Pages output.

## Next step

Record the clean baseline, then integrate each ready-for-integration delivery in content → map → visual order.
