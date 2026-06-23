# TNO Owner Base Color Coverage Phase 1.5 + 2A

## Goal

Verify that commit `123e36ec` keeps full political derived state stable after chunk promotion, then fix TNO owner/base-color coverage gaps for `CF`, `CG`, `CM`, `CY`, `EH`, `GA`, `MT`, `TW`, and `VA` with a generic owner color universe mechanism.

## Scope

- In scope: Phase 1.5 browser smoke evidence, owner/base-color diagnosis, palette bridge or scenario apply owner color universe repair, focused Node/Python/browser tests, Pages dist sync if required.
- Out of scope: Thematic panel, Appearance panel layout, Map Content UI, 1936/1939 Red Sea repair, and parent checkout `data/i18n/manual_ui.json`.

## Acceptance

- Full `npm run test:e2e:dev:scenario-chunk-runtime` shows no stable/deferred POL/FRA/common-country `landDataCoverageMissing`.
- `primaryVisibleFeatureSubsetActive` appears only as first-frame/transient evidence.
- Missing TNO color tags are proven to be owner/base-color coverage gaps, not missing features.
- Generic owner color universe includes country tags, owner/controller tags, political payload canonical codes, shell owner hints, and directly available releasable/subject/parent owner tags.
- Country-map external two-letter owner codes can resolve through ISO2 bridge or deterministic generated color without overriding explicit seed/country colors.
- Focused Node/Python/browser tests and review pass.

## UltraQA Scenario Matrix

| ID | Scenario | Expected Signal | Status |
| --- | --- | --- | --- |
| P15-FULL-SMOKE | Full scenario chunk runtime browser smoke on `origin/main@123e36ec` | Phase 1 derived state remains stable; Phase 2A color gaps are isolated | passed for Phase 1.5 signal; residual post-edit pixel probe remains separate |
| P2A-DIAG-CODES | Diagnose `CF/CG/CM/CY/EH/GA/MT/TW/VA` source and color path | Features exist; owner/base-color source is missing or generated | done |
| P2A-UNIT-BRIDGE | Country-map external owner codes get colors | ISO2/generate fallback fills codes without overriding explicit colors | passed |
| P2A-LIFECYCLE | TNO complete political owner universe has base colors | Every observed owner code has a resolved base color | passed |
| P2A-BROWSER-COLOR | TNO runtime colors for target feature ids are non-empty and rendered | No transparent/blank color for target codes | passed |
| DIRTY-GUARD | Parent checkout dirty `manual_ui.json` remains untouched | Parent status still shows only original manual UI change | passed |

## Checklist

- [x] Create clean worktree from `origin/main@123e36ec`.
- [x] Create Ultragoal and UltraQA state.
- [x] Add active plan/context/task docs.
- [x] Run Phase 1.5 full browser smoke.
- [x] Locate color resolver / palette bridge / scenario apply chain.
- [x] Record missing-code provenance table.
- [x] Implement generic owner color universe repair.
- [x] Add focused tests.
- [x] Run validation matrix.
- [x] Run independent review and first-principles self-check.
- [ ] Commit, push, and clean worktree.
