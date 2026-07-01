# Phase 6C Sample Switcher Plan

## Classification

- Risk level: complex.
- Reason: touches shared sample import flow, Guide UI, URL state, dirty-state confirmation, tests, docs, and generated Pages dist.
- Owner: main Codex thread owns implementation decisions and all live processes.

## First-Principles Implementation Plan

1. Extract shared sample import workflow.
   - Add a small core helper, likely `js/core/sample_project_import_workflow.js`.
   - Public API: `loadPublicSampleProjectIntoRuntime(sampleId, { targetState, helpers, importOptions })`.
   - The helper owns manifest/project fetch, `sampleProjectDeeplink` writes, public error normalization/toast, and `importProjectTextThroughFunnel()`.
   - Startup owns scheduling only; Guide switcher owns user intent, dirty confirmation, and URL update.
   - Keep import through `importProjectTextThroughFunnel()` and `FileManager` normalization.
   - Preserve `pending` as startup scheduling state; shared helper preserves `loading/importing/success/error`.

2. Add public sample list resolver.
   - Reuse manifest safety rules.
   - Public API: `resolvePublicSampleProjectListFromManifest(manifest, { projectBaseUrl })` plus async `loadPublicSampleProjectList({ fetchImpl, manifestUrl, projectBaseUrl })`.
   - Data source is only `landing/assets/sample-runs.json` through the existing app manifest URL.
   - Ordering follows manifest `sample_projects` order.
   - Entries include id, title, scenarioId, projectUrl, appProjectUrl, fileName, manifestVersion, and recipe array.
   - Validation and display filtering are separate:
     - validate every checked-in manifest sample entry for id shape, scenario id presence, checked-in project URL, safe file name, and recipe shape;
     - classify whether the scenario is public or developer-preview;
     - include only public non-developer-preview entries in public list output.
   - Developer-preview entries such as `hgo_1936` are hidden from public list output, while unsafe URLs and invalid files remain hard errors even on hidden entries because the checked-in manifest would be corrupt.
   - Prove `hgo_1936` stays excluded.

3. Extend Guide sample card.
   - Add compact switcher controls inside the existing sample-aware card.
   - Support active sample, no-active-sample starter state, selected state, loading/importing disabled state, error retry, and keyboard-accessible buttons.
   - Five choices are rendered as real buttons with title and scenario id; current sample gets `aria-current="true"` and selected styling.
   - During loading/importing, the chosen item is marked busy and switching controls are disabled.
   - Error state keeps the list visible so the user can choose another sample.
   - The Guide card controller may read selection/import state and emit choice events; it does not own import, routing, manifest validation, URL mutation, dirty confirmation, or `sampleProjectDeeplink` writes.

4. Add dirty-state confirmation.
   - Check `runtimeState.isDirty` before replacing current workspace.
   - The check happens after the user chooses a different sample and before any fetch/import state write.
   - Cancel keeps the current state untouched.
   - Confirm continues with replacement through the shared helper.
   - "Save before switching" is copy guidance only in this phase; no new autosave/export branch is added.
   - Confirm starts the shared sample import workflow.

5. Update URL after UI switching.
   - Use same-origin `history.replaceState` through existing URL helper.
   - Add a helper such as `syncSampleProjectUrlState(sampleId)` to `createUiSurfaceUrlState()`.
   - Set `sample=<id>` and `view=guide`, preserve `guide_section`, delete legacy `sample_project`, and leave unrelated params/hash intact.
   - Run URL update after successful import only, so cancel/failure leaves the previous URL and workspace identity intact.
   - Keep refresh semantics clear in copy.

## State Transition Table

| Event | `sampleProjectDeeplink` | URL `sample` | Workspace data | Dirty state | Guide selected UI |
| --- | --- | --- | --- | --- | --- |
| Initial no sample | unchanged empty/default | unchanged | unchanged | unchanged | no selected sample; starter copy visible after list loads |
| Choose current sample | unchanged | unchanged | unchanged | unchanged | current sample remains `aria-current=true` |
| Choose different sample, clean workspace | `loading -> importing -> success` for chosen id | updated after success only | replaced after import success | cleared by import funnel | changes after success state |
| Choose different sample, dirty workspace, cancel | unchanged | unchanged | unchanged | remains dirty | current sample remains selected |
| Choose different sample, dirty workspace, confirm | `loading -> importing -> success` for chosen id | updated after success only | replaced after import success | cleared by import funnel | changes after success state |
| Fetch failure | `error` for attempted id with public message | unchanged old value | unchanged usable project | unchanged | old sample remains selected; error copy visible |
| Import failure | `error` for attempted id with public message | unchanged old value | current project remains usable | unchanged unless import funnel changed it before failure; test should cover practical observed state | old sample remains selected; error copy visible |
| Unsafe/unknown sample | `error` for attempted id | unchanged old value | unchanged usable project | unchanged | old sample remains selected; list remains usable |

6. Update tests, docs, and dist.
   - Extend existing sample Node tests and E2E spec.
   - Keep release smoke to list-only assertion.
   - Node test matrix: resolver ordering, HGO/developer-preview exclusion, hidden-entry URL corruption still fails, selected/disabled/error view state, dirty cancel helper/orchestrator, URL helper success-only semantics.
   - E2E matrix: TNO deeplink opens Guide, list has five samples and excludes HGO, switch to Modern Japan succeeds, URL updates, dirty cancel keeps original sample when affordable.
   - Run required validation and regenerate Pages dist.

## Ralplan Consensus Notes

- Planner review: first pass requested tighter API/list/state/dirty/URL boundaries; this plan has been revised to address those points.
- Architect review: WATCH, approved for critic review. Guardrails: keep `sampleProjectDeeplink` writes inside the confirmed import transaction, keep Guide controller mostly UI-only, write URL only after successful import, and filter developer-preview list entries before fatal public-list validation.
- Critic review: APPROVE after plan repair. Residual risks accepted: dirty cancel E2E may be replaced by helper/orchestrator coverage if browser cost is high; browser back/history behavior remains follow-up scope; implementation must keep import/routing out of the Guide card controller.

## Validation Target

- `npm run test:node:sample-project-contracts`
- focused sample Guide/switcher E2E
- `npm run test:node:landing-showcase-view`
- `npm run verify:pages-dist`
- local generated `/dist/` release gate if available
- `npm run verify:dist-drift`
- `npm run verify:test-import-graph`
- `git diff --check`
