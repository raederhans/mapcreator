# Scenario Forge P1 Remaining Renderer Context Plan

Date: 2026-07-09

Status: complete; G001/G002 evidence commit `3d4c8d12`; P1.6 is `green` at functional Lore commit `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4` with evidence checkpoint `1e14c944855225ec3913bd27bc942e86ede03202`; P1.7 is complete at functional Lore commit `5f78f3a545d1cfae2e311019718e25b5397bb218` with evidence checkpoint `f355546c281da1e51cbbbe651fb96a55801267cc`; P1.8 is complete at functional Lore commit `5a8deeebcccbc3d5a4f06e83f9a33c69baa70f16`; P1 Closeout integrated, pushed, and cleaned; next phase is P2

## Progress

- G001 integration setup and G002 P1.5 acceptance are recorded in Lore evidence commit `3d4c8d12b1a2516b22d45afc64bf11b396d23d5e`.
- P1.5 is `green`: root-owned full `verify:core` passed 53/53 commands from clean `a8f71822`.
- P1.6 code, regression contracts, verification metadata, package entries, architecture-checker title synchronization, and the two checked-in Pages mirrors are implemented in the worktree.
- The root-owned nine-group focused matrix passed; the new named Node suite passed 4/4 and the named Python boundary passed 5/5.
- Architecture, state-write allowlist, test-import graph, supervisor-contracts, and supervisor-plan gates exited 0. Three independent static review lanes returned `APPROVE`.
- The final branch-history adaptive selector exited 0 with `unmatchedChangedFiles=[]`; its artifacts are `.runtime/reports/generated/p1-6-final-adaptive-selection.json`, `.runtime/reports/generated/p1-6-final-adaptive-selection.md`, and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-final-selector.log`.
- The planned pre-edit selector has no durable evidence and is recorded as a process deviation.
- The first clean-HEAD `verify:core` attempt passed 54/55 commands. Its only failure was `verify:dist-drift`: the checked-in `dist/pages-dist-manifest.json` still held the old sizes for the two P1.6 Pages mirrors. The canonical builder changed four size fields only.
- The canonical manifest was amended into the same P1.6 functional commit. A fresh clean-HEAD `npm run verify:core` rerun passed 55/55 with exit 0; the log is `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-full-core-rerun.log` and the report is `.runtime/reports/generated/verify-core.json`.
- The post-rerun worktree returned clean before these evidence documents were edited. Committed source/dist Git blobs match: `map_renderer.js` is `b494fe2d97be761963a7b32493fec40ae4034de3`, `renderer_runtime_context.js` is `f680c25e307a91b819ecdd35d8258ef610a7475a`, and the canonical manifest blob is `075ac209a96c88e26d97effa406b3c546de50ebb`.
- P1.7 now strengthens the existing P54 Node inventory, adds the canonical Python click-selection composition-root boundary, and registers both commands as child-safe `renderer-owner` leaves. Production and generated file scope is empty.
- The root-owned P1.7 pre-edit selector exited 0 with 183 recommended commands. Its only unmatched path was the new phase record; both new metadata entries now include that record in `sourceRefs`.
- The initial pre-rework root matrix recorded Node 8/8, Python 6/6, metadata 13/13, core runner 8/8; architecture/state-write/import-graph/supervisor-contracts/supervisor-plan exit 0; and actual-diff selection for 11 files with 184 recommended commands, 5 main-thread commands, and `unmatchedChangedFiles=[]`.
- The first static review returned `BLOCK` for missing HGO/facility branch topology, generic one-line return-expression coverage, and exact locks for frozen modifiers plus the output target-kind enum.
- Post-first-rework root evidence is fresh and green: Node 8/8, Python 6/6, metadata 13/13, core runner 8/8; the five shared gates exit 0; selector 11 files / 184 commands / 5 main-thread / `unmatchedChangedFiles=[]`; production guard empty; route registry 279; core list 57.
- The second static review returned `BLOCK` for multiline string/comment false positives in the line-only return counter. Root added masking plus a dedicated fixture subtest while retaining the four branch slices and seam locks.
- Final root evidence is green: Node 9/9, Python 6/6, metadata 13/13, core runner 8/8, five shared gates exit 0, final selector 11 files / 184 commands / 5 main-thread / zero unmatched, production guard empty, route schema 279, core list 57, and diff check exit 0.
- At the pre-commit checkpoint, architecture, test-engineer, and code/evidence reviewers each returned `APPROVE / Architectural Status: CLEAR`.
- P1.7 functional Lore commit `5f78f3a545d1cfae2e311019718e25b5397bb218` has trailers parsed by `git interpret-trailers`; the worktree was clean immediately after commit.
- Root-owned clean-HEAD `npm run verify:core` passed 57/57 with exit 0 and returned the worktree clean. Committed history-mode selection reported 23 files / 186 commands / 6 main-thread / zero unmatched. The protected P1.7 phase diff is empty.
- P1.7 is complete at functional Lore commit `5f78f3a545d1cfae2e311019718e25b5397bb218`; its docs-only evidence checkpoint is `f355546c281da1e51cbbbe651fb96a55801267cc`.
- The root-owned P1.8 pre-edit selector reported 19 files, 186 commands, 6 main-thread commands, and one unmatched path: the new P1.8 phase record.
- TDD RED is confirmed at `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-8-owner-red.log`: the targeted first subtest exited 1 solely because the pure owner module did not yet exist.
- P1.8 implementation now contains one pure owner, one composition-root delegation, behavior and boundary regressions, architecture assertions, package/default-core routing, updated phase/control documents, generated Pages mirrors/manifest, and the matching scenario-chunk static contract update for `decision.devSelectionRequested`. Focused/shared deterministic gates, actual selector, `verify:pages-dist`, clean-head drift, clean-head core 58/58, committed selector, independent reviews, and diff check are green.
- P1 Closeout completed, integrated to `origin/main`, and the isolated P1 worktree was cleaned. P2 starts from clean `origin/main@b14165c0e693a87872361b87ac78dc31cd7a0155`.

Approved sources:

- `C:\Users\raede\Desktop\dev\mapcreator\.omx\plans\scenario-forge-p1-remaining-renderer-context-plan.md`
- `C:\Users\raede\Desktop\dev\mapcreator\.omx\plans\prd-scenario-forge-p1-remaining-renderer-context.md`
- `C:\Users\raede\Desktop\dev\mapcreator\.omx\plans\test-spec-scenario-forge-p1-remaining-renderer-context.md`

Architect and Critic approved these sources. Their DRAFT banners are RALPLAN process residue.

## Goal

Accepted the remote P1.5 baseline, then completed P1.6, P1.7, P1.8, and P1 Closeout in one linear isolated worktree. `RendererRuntimeContext` remained a read-model boundary; time, event resolution, scheduling, writes, metrics, DOM work, and user-visible effects stayed in `map_renderer.js` as the composition root.

## Invariants

- Preserve user-visible behavior and the current click-selection effect order.
- Keep `js/core/map_renderer/public.js`, draw/pass behavior, UI, CSS, scenario data, and dependencies outside the migration scope.
- Add regression coverage for each verified behavior change.
- Register every new test through a named package entry, verification metadata, route selection, and the default `verify:core` group when required.
- Keep selector route gaps at zero and avoid allowlist expansion as a test fix.
- Use Lore commit messages and complete one phase before starting the next.

## Phases

### 0. Integration preflight

- Use `origin/main@a8f71822d705fcd3b26c32db1abd417b41264eb0` as the remote P1.5 base.
- Preserve the dirty parent checkout.
- Record worktree ownership, shared hotspots, verification ownership, and integration order in the registry.

### 1. P1.5 remote acceptance

- Inspect the interaction read model, receiver wiring, tests, metadata, package scripts, Pages mirrors, and active documentation.
- Run focused contracts, selector/supervisor gates, Pages/dist checks, `verify:core:list`, and full `verify:core`.
- Record `green` only when full core exits 0.
- Record `accepted_with_external_blocker` only after commands 1-52 pass on the baseline run and two additional clean reruns; command 53 is exactly `npm run verify:pages-dist`; every attempt binds to `HEAD=a8f71822`; both reruns reproduce the same unchanged-Landing-only path set and assertion family; every row records exact exit code, OS build, Node/npm/Python versions, dependency state, and lockfile hash; every Landing path has before/after SHA-256 and diff classification; both P1.5 source/dist pairs are byte-identical; the staged Landing path set is empty; and the integration owner records the approved disposition.
- Any different path set, assertion family, earlier failure, missing field, parity failure, staged Landing output, or verified P1.5 defect keeps the phase open. A verified defect receives a P1.5-only fix and regression update.

Execution checkpoint (G001/G002):

- G001 completed the isolated worktree, branch, exact-base, parent-WIP preservation, registry, Junction, log-root, and live-owner preflight.
- G002 accepted P1.5 as `green` from clean `HEAD=a8f71822d705fcd3b26c32db1abd417b41264eb0`: root-owned `npm run verify:core` exited 0 with 53/53 commands, including `verify:pages-dist` and `verify:dist-drift`.
- Evidence is stored in `.runtime/reports/generated/verify-core.json` and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-5-full-core-original.log`; the worktree returned clean after the run, before these evidence documents were restored for their Lore commit.
- Committed source/dist Git blobs match for both P1.5 pairs: `map_renderer.js` is `24d9718b816c1a4a7f912980d34755eab9620718` and `renderer_runtime_context.js` is `27afb4005a05e8a8b8b6d7fab52096dad9e781e2`. Checkout raw SHA differences come from `core.autocrlf` line-ending conversion.
- Independent static audit returned `APPROVE`. Effects, handlers, timing, scheduling, metrics, and click selection remain composition-root owned. Selector route gaps are zero.
- Explicit P1.5 unrun lanes remain `verify:core:main-thread`, browser, dev server, and Playwright. P1.6 later completed green; P1.7 is the next pending phase.

### 2. P1.6 hit/hover read capsule

- Add the minimum frozen `interaction.hitHover` read model containing stable constants and readonly state/surface accessors.
- Keep clocks, event parsers/resolvers, schedulers, metrics, writes, cursor/overlay work, tooltip/UI work, and DOM effects in the composition root.
- Extend the existing hit-canvas and hover inventories, add the planned Node/Python boundary contracts, register routes, synchronize Pages mirrors, and run focused plus full gates.
- Define `test:python:map-renderer-hit-hover-context-boundary` as `npm run python -- -m unittest tests.test_map_renderer_hit_hover_context_boundary_contract -q`; metadata, routing, and acceptance use this named npm entry.

Execution checkpoint:

- Process deviation: the planned pre-edit SF-ATS dry-run has no durable evidence. This gap is recorded explicitly rather than credited as an executed gate.
- The final branch-history selector exited 0 with `unmatchedChangedFiles=[]` and wrote `.runtime/reports/generated/p1-6-final-adaptive-selection.{json,md}` plus `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-final-selector.log`.
- All nine focused test groups passed, including the new Node capsule suite at 4/4 and the named Python boundary at 5/5.
- `verify:architecture-boundaries`, `verify:state-write-allowlist`, `verify:test-import-graph`, `verify:supervisor-contracts`, and `verify:supervisor-plan` all exited 0.
- Three independent static reviewers returned `APPROVE` for the runtime boundary, architecture/first-principles shape, and test/SF-ATS coverage.
- Functional Lore commit `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4` includes the canonical manifest amend. The fresh clean-HEAD `npm run verify:core` rerun passed 55/55 with exit 0 and returned the worktree to clean state before evidence editing.
- Committed Git-blob parity is green for both source/dist pairs: `map_renderer.js` at `b494fe2d97be761963a7b32493fec40ae4034de3` and `renderer_runtime_context.js` at `f680c25e307a91b819ecdd35d8258ef610a7475a`; manifest blob `075ac209a96c88e26d97effa406b3c546de50ebb` anchors the accepted size inventory.
- P1.6 is `green`, complete, and ready for integration. The next phase is P1.7 click-selection preflight.

### 3. P1.7 click-selection preflight

- Keep production renderer behavior unchanged.
- Extend the real P54 inventory and add the canonical Python click-selection transaction boundary.
- Register the exact `click-selection-transaction` package, metadata, route, and default-core names.
- Lock branch/effect ordering and the future owner input/output boundary before implementation.
- Reuse the sole P54 Node file `tests/renderer_click_selection_transaction_inventory_boundary.test.mjs` through `npm run test:node:renderer-click-selection-transaction-inventory`.
- Canonical Python layers are: file `tests/test_map_renderer_click_selection_transaction_boundary_contract.py`; package/commandRef `test:python:map-renderer-click-selection-transaction-boundary`; metadata/route ID `verify-core:test:python:map-renderer-click-selection-transaction-boundary`; default group `renderer-owner`. The package body is `npm run python -- -m unittest tests.test_map_renderer_click_selection_transaction_boundary_contract -q`.

Execution checkpoint:

- The pre-edit explicit-input SF-ATS dry-run exited 0 for all 11 planned paths with 183 recommended commands. The sole unmatched file was `docs/active/renderer-click-selection-transaction-preflight-p1-7-20260709.md`; artifacts are `.runtime/reports/generated/p1-7-pre-edit-adaptive-selection.{json,md}` and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-7-pre-edit-selector.log`.
- The sole P54 Node file locks the full pre-hit guard spine, explicit sync/async and read-only/effectful categories, strict local return counts, empty/special/water order, land clearing and dev selection, every land-eraser subpath, land fill, unchanged water fill, `applyWaterRegionFill`, and `applyVisualSubdivisionFill`.
- The production-zero guard now covers staged, unstaged, and untracked paths through `git status --porcelain=v1 --untracked-files=all -- js dist tools/eslint-rules/state-writer-allowlist.json`.
- The canonical Python boundary locks root ownership of initial/refreshed hit resolution, feature lookup, async hydration, history, dirty state, sidebar refresh, render requests, metrics, binding/funnel injection, and hit-candidate purity while owner/import/delegation topology remains empty for P1.7.
- The initial pre-rework matrix was green. The first static review then returned `BLOCK` for missing HGO/facility topology, general line-return coverage, and frozen-modifier/target-kind locks.
- Post-first-rework root evidence is fresh and green: Node 8/8, Python 6/6, metadata 13/13, core runner 8/8, five shared gates at exit 0, selector 11 files / 184 commands / 5 main-thread / zero unmatched, production guard empty, route registry 279, and core list 57.
- The second minimal review rework added HGO active, facility-details, facility block-underlying, and selected-facility-clear local topology plus the two seam doc locks. The second static review then returned `BLOCK` for multiline string/comment false positives in the line-only return counter; root added masking and a dedicated fixture subtest.
- Final root evidence is green: Node 9/9, Python 6/6, metadata 13/13, core runner 8/8, five shared gates exit 0, final selector 11 files / 184 commands / 5 main-thread / zero unmatched, production guard empty, route schema 279, core list 57, and diff check exit 0 with `core.autocrlf` warnings only. Protected production/checker/P54 surfaces have zero diff.
- Final static review is green: architecture, test-engineer, and code/evidence reviewer each returned `APPROVE / Architectural Status: CLEAR`.
- Functional Lore commit `5f78f3a545d1cfae2e311019718e25b5397bb218` passed trailer parsing. Clean-HEAD full core passed 57/57 with report `.runtime/reports/generated/verify-core.json` and log `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-7-full-core-clean-head.log`; the worktree was clean before and after the run.
- Committed selector evidence is `.runtime/reports/generated/p1-7-committed-adaptive-selection.{json,md}` with log `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-7-committed-selector.log`, 23 files, 186 commands, 6 main-thread commands, and zero unmatched. The protected phase diff from `1e14c944` to `5f78f3a5` is empty.

### 4. P1.8 pure transaction seam

- Atomically add the unique pure click-selection owner, its single root call, behavior tests, P54 presence assertions, and architecture assertions.
- The owner accepts a resolved hit plus frozen readonly modifiers and returns the closed `{ decision, target }` contract.
- Root admission must consume the returned target and decision while all lookup, async hydration, writes, history, dirty state, render, metrics, and DOM effects stay root-owned.
- The exact entry is `resolveClickSelectionDecision(resolvedHit, readonlyModifiers) -> { decision, target }`; root freezes ctrl/meta/shift/alt booleans and passes no DOM event or runtime state.
- `decision` is exactly `{ devSelectionRequested: boolean }`. Empty target is exactly `{ kind: "empty" }`. Land/water/special targets are exactly `{ kind, id, countryCode, runtimeCountryCode }`, with unavailable identities set to `null`. Feature objects, DOM/event values, callbacks, nested objects, and extension keys are rejected.
- Root uses only returned `target.kind`/`target.id` for empty/special/water/land admission and only returned `decision.devSelectionRequested` for the dev-selection branch. Raw hit data is available after admission for root-owned lookup, hydration, refreshed-hit work, and effects.
- Preserve order: readonly/tool/editor/HGO/facility guards -> root hit resolution -> pure call -> returned admission -> empty clear or `updateDevSelectedHit` -> membership -> special effects -> water effects -> land clearing -> feature lookup -> decision-driven dev selection -> async hydration -> refreshed-hit resolution/lookup -> preset/eraser/eyedropper/fill -> history, dirty, sidebar, render, metrics.

Execution checkpoint:

- Pre-edit explicit-input selection reported 19 planned files, 186 commands, 6 main-thread commands, and only `docs/active/renderer-click-selection-pure-decision-owner-p1-8-20260709.md` unmatched. The new phase record is now included in the P1.8 metadata source references; root will record the actual-diff selector after verification.
- The root-owned TDD RED run targeted the owner behavior test before production implementation and exited 1 on the expected missing-module assertion only. Log: `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-8-owner-red.log`.
- Implementation adds `js/core/map_renderer/click_selection_transaction_owner.js`, projects the exact four scalar hit fields in `map_renderer.js`, freezes the four modifier booleans at the root, delegates once, and consumes the returned target/decision for admission and the land dev-selection branch.
- Water ctrl/meta toggle stays root-owned and reads `readonlyModifiers` independently. History, dirty state, selection writes, feature lookup, hydration, refreshed-hit work, sidebar refresh, render requests, DOM/UI work, and metrics stay in `map_renderer.js`.
- The new owner behavior suite rejects malformed or extended input records and covers empty, land, water, special, blank identity, and nonmutation behavior. Existing P54/Python boundaries and the architecture checker now assert the unique owner/delegation topology.
- The implementation lane changed no `RendererRuntimeContext`, public facade, state-write allowlist, dependency, README, UI/CSS/data, or `dist/**` path. Source guards cover protected source surfaces and extra owner paths; canonical generation plus `verify:pages-dist` and `verify:dist-drift` own the expected Pages changes.
- Verification status: focused owner 9/9, P54 10/10, Python 6/6, metadata 13/13, core runner 8/8; shared architecture/state-write/import/supervisor gates pass; actual selector reports zero unmatched; Pages builder and `verify:pages-dist` pass; three independent reviews are clear; `git diff --check` exits 0. The pre-commit `verify:dist-drift` exit 1 recorded expected uncommitted generated dist changes, and the clean-HEAD drift rerun passed after the P1.8 functional commit. The first clean-HEAD `verify:core` attempt found one stale scenario static contract for the old raw-event dev-selection gate; the contract now asserts the P1.8 decision branch and its focused rerun passes. Final clean-HEAD `verify:core` rerun passed 58/58, and committed selector reported 29 changed files / 188 commands / 7 main-thread / zero unmatched. P1.8 is complete and ready for Closeout.

### 5. P1 Closeout and integration

- Record P1.0-P1.8 truth, commits, validation, explicit unrun lanes, remaining risks, and staged P2 scope.
- Run final first-principles review, ai-slop-cleaner, independent code review, Architect review, and UltraQA.
- Push the verified linear branch, confirm remote `main`, update registry truth, preserve recovery commits, and remove the isolated worktree only after integration is proven.
- Completion truth: integrated to `origin/main`, recovery preserved at `origin/codex/renderer-runtime-context-p1-remaining-20260709@e102a70a`, and the isolated P1 worktree is already cleaned.

## Live-process ownership

The root Codex thread is the sole owner of long tests, full-core runs, Pages/dist builders, browser checks, logs, polling, retries, and process termination. Other agents may inspect source and completed artifacts only.

Log root: `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/`.

Recorded P1.5 acceptance log: `p1-5-full-core-original.log`. Reserved later-phase logs: `p1-6.log`, `p1-7.log`, `p1-8.log`, and `full-core.log`.

## SF-ATS, commits, and integration

- Run SF-ATS selector dry-run before phase edits and against actual phase changes. Any unmatched production file blocks the phase.
- P1.6 records one process deviation: its pre-edit selector has no durable evidence. The final branch-history selector is the authoritative routing proof and reports `unmatchedChangedFiles=[]`.
- P1.7 pre-edit selector evidence is durable. Its single new-document gap is addressed through both canonical entries' `sourceRefs`; final selector evidence is `.runtime/reports/generated/p1-7-final-adaptive-selection.{json,md}` with log `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-7-final-selector.log`, 11 files, 184 commands, 5 main-thread commands, and zero unmatched.
- P1.8 pre-edit selection reported 19 files / 186 commands / 6 main-thread commands with only its new phase record unmatched. Actual-diff selection reported 19 files / 187 commands / 6 main-thread commands with zero unmatched files.
- Pages/dist is required for browser-loaded renderer source changes. Deterministic checks are completion evidence.
- Every phase receives an intent-first Lore commit with rationale, constraints, rejected alternatives, confidence, scope risk, directive, tested evidence, and honest not-tested lanes.
- When full core needs clean HEAD, create the functional phase commit after focused checks, run the clean gate, then record final evidence without mixing later-phase code.
- Stage exact paths. Keep parent WIP and unrelated Landing outputs outside commits. Recheck origin before integration, integrate serially, push once, verify remote main, then clean with recovery hashes recorded.

P1.6 and P1.7 explicit unrun lanes remain recorded in their phase evidence. P1.7 evidence checkpoint `f355546c281da1e51cbbbe651fb96a55801267cc` preserves the accepted production-zero preflight. P1.8 implementation, focused/shared deterministic verification, actual selector, Pages/dist generation, clean drift, clean core, committed selector, and reviews are complete. P1 Closeout is complete. P2 becomes the next active lane in a new isolated worktree.

## Stop rules

Stop the phase for an unexplained full-core/Pages blocker, nonzero route gaps, effects entering context, visible behavior or semantic change, a semantic shared-hotspot conflict, upstream movement, unrelated WIP, three repeated failures of one edited test, or ambiguous live ownership. Root records the resolved cause and revised gate before resuming.
