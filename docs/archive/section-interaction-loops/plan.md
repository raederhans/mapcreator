# Section Interaction Loops Plan

## Goal

Polish section-level interaction loops without merging them into one global player workflow. Each section owns its own edit -> feedback -> persistence/export loop.

## Current Audit

| Section | Current loop | Gap to close in this pass |
| --- | --- | --- |
| Base map editing | Paint/fill tools already write through shared dirty state and export through Project Management. | Audit only; do not refactor the base loop in this pass. |
| Special Zones | Layer creation, member editing, style editing, scenario asset save, project export. | Make save state and disabled save reason explicit inside the workbench status surface. |
| Frontlines / Strategic Annotations | Frontline visibility plus project-local operational lines, graphics, and unit counters. | Make project-local export/save semantics visible in the section status surface. |
| Transport Workbench | Family tabs, pack selection, preview/inspector, apply bridge for main-map-capable families. | Show a family capability matrix and expose exact disabled apply reasons. |
| Appearance | Appearance owners mark dirty and FileManager exports `styleConfig`. | Make project export status say that appearance and transport settings are captured. |

## Steps

- [x] Establish current code and test anchors from repository evidence.
- [x] Add per-section status/disabled-reason UI improvements.
- [x] Extend existing tests and static contracts instead of creating a new test system.
- [x] Run targeted verification owned by the main thread.
- [ ] Run final bug review and update ultragoal evidence.

## Live Process Ownership

Main thread owns all live tests, dev server, browser smoke, and any build command. Subagents are static-only unless explicitly reassigned in `context.md`.
