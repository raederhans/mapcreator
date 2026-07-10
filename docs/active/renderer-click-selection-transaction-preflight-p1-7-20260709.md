# Scenario Forge P1.7 Click-Selection Transaction Preflight

Date: 2026-07-09

Status: `ready-for-commit`; final deterministic evidence and three-party static review are green

Base and branch:

- Initial remote base: `origin/main@a8f71822d705fcd3b26c32db1abd417b41264eb0`.
- Accepted P1.6 functional checkpoint: `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p1-remaining-20260709`.
- Branch: `codex/renderer-runtime-context-p1-remaining-20260709`.

## Outcome boundary

P1.7 is a contract-only preflight. It strengthens the existing P54 click-selection inventory, adds one canonical Python composition-root boundary, and registers both named commands in the renderer-owner verification lane. `js/**`, `dist/**`, the state-write allowlist, the original P54 preflight record, and the architecture checker retain their accepted P1.6 contents.

`RendererRuntimeContext` continues to carry readonly models. Click-selection execution remains in `map_renderer.js` for this phase.

## Future P1.8 seam

P1.7 documents the next pure seam while keeping owner/import/delegation count at zero.

The planned entry is:

`resolveClickSelectionDecision(resolvedHit, readonlyModifiers) -> { decision, target }`

Input contract:

- `resolvedHit` has exactly four own keys: `targetType`, `id`, `countryCode`, and `runtimeCountryCode`.
- Every `resolvedHit` value is a scalar string or `null`; `targetType` accepts exactly `"land"`, `"water"`, `"special"`, or `null`.
- The current empty-hit contract is `targetType: null`, `id: null`, `countryCode: null`, and `runtimeCountryCode: null`.
- Missing or blank `id`, `countryCode`, and `runtimeCountryCode` inputs normalize to `null`.
- `readonlyModifiers` has exactly four own keys: `ctrlKey`, `metaKey`, `shiftKey`, and `altKey`, and every value is a boolean.
- Root creates `readonlyModifiers` with exactly those four boolean own keys and freezes it with `Object.freeze` before calling the pure seam.
- Extra own keys, object values, functions, DOM/Event values, and nested values are rejected.

Output contract:

- The output has exactly two own keys: `{ decision, target }`.
- `decision` is exactly `{ devSelectionRequested: boolean }`.
- An empty target is exactly `{ kind: "empty" }`.
- A nonempty target is exactly `{ kind, id, countryCode, runtimeCountryCode }`.
- `target.kind` accepts exactly `"empty"`, `"land"`, `"water"`, or `"special"`.
- Nonempty `id`, `countryCode`, and `runtimeCountryCode` values are scalar strings or `null`; missing or blank identity values normalize to `null`.
- `devSelectionRequested = target.kind === "land" && (readonlyModifiers.ctrlKey || readonlyModifiers.metaKey)`.
- Root consumes only returned `target.kind` and `target.id` for admission, and only returned `decision.devSelectionRequested` for the dev-selection branch.
- Raw hit data becomes available only after returned-target admission for root-owned lookup, hydration, refreshed-hit resolution, and effects.

Feature objects, runtime state, DOM values, event objects, functions, callbacks, nested extension objects, and extra keys are rejected by this pure contract.

## Root-owned transaction work

`map_renderer.js` retains initial and refreshed hit resolution, feature lookup, async detail hydration, history capture and commit, dirty-state writes, selection writes, sidebar refresh, render requests, UI/DOM work, and metrics. The interaction funnel keeps the dispatch bridge, the event-binding owner keeps injected click handlers, and `interaction_hit_candidates.js` remains a pure candidate resolver.

The preflight locks this execution spine:

readonly/tool/editor/HGO/facility guards -> root hit resolution -> empty/special/water/land admission -> dev selection -> async hydration -> refreshed hit and feature lookup -> preset/eraser/eyedropper/fill -> history, dirty, sidebar, render, metrics.

## Ordered inventory coverage

The existing Node inventory now uses the `handleClick` to `handleDoubleClick` slice and checks:

- one global branch spine covering readonly, data availability, brush suppression, onboarding, intensity, four editor guards/actions, HGO, facility, and hit admission;
- local HGO-active, facility-details, facility-block-underlying, and selected-facility-clear action/effect/return topology;
- empty-click water and special clear order;
- special selection and eyedropper order;
- water toggle, open-ocean, eraser, eyedropper, and fill order;
- land water/special selection clear before land lookup, plus the internal dev-selection modifier/toggle/inspector/metric order;
- sovereignty, country, and feature land-eraser subpaths independently;
- land fill order;
- `applyWaterRegionFill` transaction order;
- the unchanged-water sidebar -> render -> `return false` order in its own local slice;
- `applyVisualSubdivisionFill` transaction order.

Each ordered step carries an explicit `sync-read-only`, `sync-effectful`, `async-read-only`, or `async-effectful` category. The helper enforces the exact category/reason/token schema, allowed categories, nonempty values, unique reasons/tokens/classifications, and forward-only lookup. A strict line-scoped helper masks multiline strings/comments, recognizes bare returns, boolean returns, and any other single-line `return expression;` form, and has a dedicated fixture subtest. It locks HGO/facility-details/facility-block/selected-facility-clear=1/1/1/0 plus empty=1, special=3, water=7, sovereignty/country/feature eraser=0/0/0, land eraser wrapper=1, land fill=3, `applyWaterRegionFill`=3, and `applyVisualSubdivisionFill`=2. Existing P54 test titles, section headings, exact tokens, and architecture-checker-dependent error strings remain stable.

The production-zero assertion uses the exact staged-and-untracked-aware scope:

`git status --porcelain=v1 --untracked-files=all -- js dist tools/eslint-rules/state-writer-allowlist.json`

## Changed files

Tests:

- `tests/renderer_click_selection_transaction_inventory_boundary.test.mjs`
- `tests/test_map_renderer_click_selection_transaction_boundary_contract.py`
- `tests/verification_metadata_behavior.test.mjs`
- `tests/verify_core_runner_behavior.test.mjs`

Routing and package:

- `package.json`
- `tools/verification/verification_domains.mjs`

Documentation:

- this phase record
- `docs/active/renderer-runtime-context-p1-remaining-20260709/{plan.md,context.md,task.md}`
- `docs/active/_worktree_registry.md`

Production and generated files: empty.

## Verification registration

- `test:node:renderer-click-selection-transaction-inventory` runs exactly `node --test tests/renderer_click_selection_transaction_inventory_boundary.test.mjs`.
- `test:python:map-renderer-click-selection-transaction-boundary` runs exactly `npm run python -- -m unittest tests.test_map_renderer_click_selection_transaction_boundary_contract -q`.
- Metadata IDs are `verify-core:test:node:renderer-click-selection-transaction-inventory` and `verify-core:test:python:map-renderer-click-selection-transaction-boundary`.
- Both entries use `domain: "renderer-runtime"`, `ownerHint: "renderer-runtime"`, `layer: "contract"`, `cost: "fast"`, `resourceLocks: []`, `executionOwner: "child-safe"`, `ciProfile: "pr-fast"`, `verifyCoreDefaultGroup: "renderer-owner"`, `supervisorDomain: "renderer-runtime"`, and `routeRegistry: true`.
- This phase record is present in both entries' `sourceRefs`, closing the only pre-edit route gap after implementation.

## SF-ATS pre-edit evidence

The root-owned explicit-input dry-run exited 0 and recommended 183 commands for the 11 planned P1.7 paths. Its only unmatched file was this new phase record, which did not exist in metadata before the edit.

Artifacts:

- `.runtime/reports/generated/p1-7-pre-edit-adaptive-selection.json`
- `.runtime/reports/generated/p1-7-pre-edit-adaptive-selection.md`
- `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-7-pre-edit-selector.log`

## Current verification state

The initial pre-rework root matrix recorded these green observations:

- named Node inventory: 8/8;
- named Python boundary: 6/6;
- verification metadata behavior: 13/13;
- verify-core runner behavior: 8/8;
- architecture, state-write allowlist, test-import graph, supervisor contracts, and supervisor plan: exit 0;
- actual-diff selector: 11 files, 184 recommended commands, 5 main-thread commands, `unmatchedChangedFiles=[]`.

The first static review then returned `BLOCK` for missing HGO/facility branch topology, generic one-line return-expression coverage, and exact locks for frozen modifiers plus the output target-kind enum.

After the first review rework, root recorded fresh green evidence:

- named Node inventory: 8/8;
- named Python boundary: 6/6;
- verification metadata behavior: 13/13;
- verify-core runner behavior: 8/8;
- architecture, state-write allowlist, test-import graph, supervisor contracts, and supervisor plan: exit 0;
- actual-diff selector: 11 files, 184 recommended commands, 5 main-thread commands, `unmatchedChangedFiles=[]`;
- production guard: empty;
- route registry: 279 routes;
- core list: 57 commands.

The second static review returned `BLOCK` because a line-only return regex could count return-like text inside multiline strings/comments. Root retained the four local HGO/facility topology slices and seam locks, added multiline string/comment masking plus a dedicated fixture subtest, and then ran the final matrix.

Fresh final root evidence:

- named Node inventory: 9/9, exit 0;
- named Python boundary: 6/6, exit 0;
- verification metadata behavior: 13/13, exit 0;
- verify-core runner behavior: 8/8, exit 0;
- architecture, state-write allowlist, test-import graph, supervisor contracts, and supervisor plan: exit 0;
- final selector: 11 files, 184 recommended commands, 5 main-thread commands, `unmatchedChangedFiles=[]`;
- selector artifacts: `.runtime/reports/generated/p1-7-final-adaptive-selection.{json,md}`;
- selector log: `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-7-final-selector.log`;
- production status guard: empty; route schema: 279; `verify:core:list`: 57;
- `git diff --check`: exit 0 with `core.autocrlf` warnings only.

Final static review results are architecture `APPROVE / Architectural Status: CLEAR`, test-engineer `APPROVE / Architectural Status: CLEAR`, and code/evidence reviewer `APPROVE / Architectural Status: CLEAR`. Current production code, `dist/**`, the state-write allowlist, architecture checker, and original P54 document have zero diff. Pending P1.7 work is the independent Lore functional commit, clean-HEAD `npm run verify:core`, phase-commit comparison, and evidence checkpoint. `verify:core:main-thread`, browser, dev server, and Playwright remain explicit unrun lanes.

## Delivery state

P1.7 is `ready-for-commit`. Root creates the Lore functional commit, runs clean-HEAD full core, compares the phase commit, and records the evidence checkpoint before P1.8.
