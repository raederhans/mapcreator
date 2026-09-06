# Implementation status
## Stage 3 scenario wave — complete planning, workflow and inspector, 2026-09-06

Completed locally following the user's request for a larger autonomous wave. Regional presets now prepare core ownership plans, including explicit variant validation, visible targets and restoration of non-selected variant territory. New scenario_territory_controller.js owns core/variant application and failure coordination; scenario_inspector_controller.js owns the complete action panel, shared navigation cards, hierarchy groups, presets and visual controls. Existing transfer and transaction owners remain integrated.

Repairs: failed core application no longer activates an owner or changes paint mode; variant selection preflights before changing selection and returns the actual application result. Tests compose real controllers instead of extracting Sidebar source via AST/VM. Sidebar 4,842 -> 4,281 lines (-561); regional controller 308 -> 386; new territory/inspector 113/430. Combined production scope is +60 lines: responsibility consolidation, not net deletion or measured rendering speedup.

Validation: five affected Node suites 54/54; Sidebar Python boundary 10/10; syntax/whitespace pass. Portfolio and 432-route schema checks pass. Four-module verify:edit correctly exceeded its three-command/90-second estimated budget and executed no tests; explicit combined Node execution supplies behavioral evidence without raising budgets. Scoped Sidebar inventory 129 -> 120, no added findings. Regional pure-reader source proof updated; exact conservative diagnostic, empty acceptedEscapes and global budgets unchanged. Bounded review found no blocking regression.

Playwright quick inspection loaded HOI4 1939, searched/selected German Reich and rendered related governments, hierarchy, regional presets and color-only panel; zero console errors/warnings. Artifacts: .runtime/browser/scenario-wave-20260906/. This proves startup/panel integration, not browser core/variant mutation; controller tests cover those flows. Owned browser/server stopped. Unexpected transaction rejection after synchronous variant setter does not roll back selection; preflight prevents known ordinary rejection paths. No full policy regeneration/admission, commit, push or publication. Original stage 3 Renderer consolidation remains outside this completed scenario wave.

## Stage 3 scenario focus — historical transfers, 2026-09-06

Completed locally: manual transfer validation/execution/feedback, automatic core companions and historical-transfer UI now share scenario_transfer_controller.js. Removed the single-use explicit-transfer wrapper and repeated result reconstruction. Automatic no-visible target preflight now respects silent mode. Existing transaction lock/history/render authority, automatic action order (including hidden automatic actions), and core-owned final shell/list refresh remain intact.

This slice: Sidebar 4,986 -> 4,842 lines; controller 115; production net -29. No rendering-speed claim. New behavior suite passed 11/11, including actual Sidebar core success/failure orchestration. Real verify:edit for the controller executed one command, 11/11, and passed portfolio/430-route checks in 2.70 s total locally. Sidebar boundary 10/10 passed. The preceding core visual suite passed 13/14 initially: its old neighboring-function extraction delimiter broke after moving the companion function. Root replaced that source-location coupling with Acorn declaration selection; the affected visual case passed its focused rerun. Unaffected tests were not rerun again.

Scoped state inventory remains 129 with no added findings; new controller has no writer binding and requires no policy exception. Bounded independent review found no material regression. All test/review ownerships are released. Full policy generation/check, browser, whole-project admission, commit/push and deployment were not run. Prior WIP is preserved. Further stage 3 scope includes the remaining scenario/core ownership coordination and bounded Renderer responsibilities.


## Stage 3 continuation — core preset visual repair, 2026-09-06

Implemented locally. Core preset resolution and presence checks moved into the existing regional preset controller. Indexed and resolved presets share application validation; Sidebar core visual uses the resolved reference. This fixes generated boundary presets (index -1) failing with missing-preset. A VM execution of the actual pre-change Sidebar functions reproduced false plus "Preset not found: AA[-1]"; the actual current visual function returns true with no ownership/hook/companion/shell side effects. Sparse preset enumeration again skips holes and retains original indices. Both stored and generated ID arrays are detached snapshots.

Validation: expanded controller suite 14/14; actual verify:edit executed one command, 14/14, with 429-route and script-portfolio checks passing (3.01 s total, one local run). Sidebar split boundary 10/10; syntax and scoped whitespace passed. Sidebar inventory 132 -> 129, with zero added findings. The existing pure-reader contract now locks one exact indexed-adapter return diagnostic by source/function/count; acceptedEscapes stays empty, and direct state escape/write/source drift negative cases remain rejected. No global scanner rule, budget or historical baseline changed.

Bounded independent review passed with no material findings in initialization order, caller compatibility or exact reader proof.

Sidebar 5,075 -> 4,986 lines; controller 187 -> 308, net production +32 lines for the shared resolved-entry path and detached values. This is a functional repair and responsibility consolidation, not net code deletion or a runtime speedup. The full generated policy was not regenerated/rechecked; previous stage 1 acceptance remains tied to its source snapshot. Browser, full P4 admission and publication were not run. This is another accepted functional slice, not all of stage 3.


## Original roadmap stage 3 — regional presets, 2026-09-06

First functional slice implemented locally. The new regional_preset_controller owns regional preset filtering, disabled state, three presentation/application modes and pre-application validation. Sidebar now supplies the existing transaction operations and three mode-specific calls; its core-territory visual path reuses the same apply entry. Ownership/color mutation implementations and history reasons remain in place. All inherited WIP is preserved.

This turn: sidebar 5,327 -> 5,075 lines; new owner 187 lines; production net -65 lines. Three duplicated section/click recipes become three single calls, and the forwarding applyPreset wrapper is removed. This is reduced maintenance surface, not a measured rendering speedup.

Validation: new focused behavior and source-bound reader regression 9/9; real verify:edit for the new owner executes one command, passes 9/9 in 2.78 s total locally, with script portfolio and 429-route checks passing. Sidebar split boundary 10/10; existing wildcard reader rejection 1/1; test import graph and source syntax checks passed. Strict scoped writer inventory: new controller zero findings; sidebar 146 -> 132 findings, no added semantic finding. The reader contract is exact-source validated, with no accepted escapes; injected writes/source drift are rejected. No budgets, historical baselines or generated policy were changed.

Bounded independent review passed: no material findings in three-mode behavior, core apply compatibility or borrowed-state contract. Both subagent ownerships are released.

Remaining stage 3 scope: other complete scenario responsibilities and bounded Renderer responsibilities. This first slice does not complete the whole stage. The generated policy has not been regenerated/rechecked for this slice; the previous stage 1 pass describes its earlier source snapshot. No browser, full P4 admission, commit, push or deployment performed.


## Stage 2 checkpoint — 2026-09-06: local verification cost reduction complete

- [x] Share one porcelain workspace read between adaptive and commit. Adaptive discovery now uses one Git process instead of three, retains both rename/copy paths, and fails on unavailable or malformed status instead of accepting partial discovery.
- [x] Calibrate only five measured Node behavior leaves on Windows. Per-group base and per-leaf time are each 1 second; unmeasured leaves/platforms retain existing defaults. Mixed-group estimates remain monotone. Cost, ownership and command/leaf/group caps are unchanged.
- [x] Compare border, inspector, mixed-domain and source-plus-test workflows before/after, three serial runs each (24 successful CLI runs). Exact execution leaf lists are unchanged and duplicate-free. Catalog planning retains six leaves; unknown-file planning exits 2 with no execution.
- [x] Independently inspect catalog/control unions through the helper task. Current controls execute once; source/root provenance is retained. Catalog plus business edits may still exceed the existing cost cap and correctly block.
- [x] Replace stale shadow and command-count assertions with current control multiplicity and exact coverage comparisons; keep fixed supersession, shared-leaf locking and missing-leaf rejection assertions.

Measured Windows medians (direct adaptive Node CLI, excluding npm wrapper): border 1.501 -> 1.359 s; inspector 1.354 -> 1.152 s; mixed 1.322 -> 1.300 s; source-plus-test 1.086 -> 1.046 s. These small timing differences are observational, not a demonstrated execution-engine speedup. Budget estimates changed respectively 50 -> 4, 30 -> 3, 50 -> 4 and 25 -> 2 seconds. The isolated workspace-discovery comparison showed 739 -> 229 ms median across three repeats, with all 137 paths preserved in that snapshot.

Validation: full commit/portfolio suites passed 72 tests; focused discovery/history/calibration tests passed 7. Full core/metadata suites initially passed 130 of 133, exposing three stale assertions from preceding governance. Each of those three was repaired and passed its targeted rerun; unaffected tests were not rerun. Scoped diff whitespace check passed. Logs, exact commands and comparison data are under `.runtime/tmp/stage2-verification-20260906/`; `comparison.json` contains timings and coverage results.

This checkpoint covers local stage 2 only. Stage 1 current-policy acceptance below remains incomplete. No commit, push, browser, P4 producer/checker, full project qualification or deployment was performed in stage 2.

## Stage 1 checkpoint — 2026-09-06: implementation advanced, policy acceptance incomplete

Resumed closure result: viewport uses numeric read snapshots and narrow projection operations (13 tests); unit-counter rendering uses primitive catalogView data (7 tests). Cache canvas ownership and opaque border-timer cancellation passed 18 tests; the exact updated owner proofs passed 2 tests and the Python viewport boundary passed. Hover callback-boundary experiments were withdrawn; restored behavior passed 15 tests. These are separate focused checks, not a whole-project qualification count.

Producer attempt 3 still exited 1 without writing: 252 violations versus 318 previously, including two baseline scopes. Later cache/timer scans remove three findings without additions, but no later full producer total is claimed. A HEAD-source comparison reproduces 64 of 66 Renderer unsupported signatures, confirming much of the remaining rejection predates these fixes. Remaining work is actual borrowed-reader/owner-call proof and current policy generation/check, not baseline refresh. Stage 1 is explicitly not complete; no commit, push or deployment occurred.

- [x] Inspect the actual special-zone input/return contract and current policy generation prerequisites.
- [x] Delete four redundant runtime wrappers and reuse canonical normalization/commit at real callers; preserve diagnostic references and hook identity.
- [x] Register the three remaining real writer exports and refresh the exact existing special-zone retirement edge.
- [x] Pass 26 action/layer and 18 Workbench behavior tests, the 28-action preflight, and the corrected viewport-owner Python boundary target.
- [x] Bounded independent runtime review: no material finding; no browser/topojson performance claim.
- [x] Move renderer border/hover and inspector/Quick Fill writes into existing action modules; preserve handles, reference identity and event ordering.
- [x] Register exact retirement evidence, including surviving optional-layer chunk calls, and reject missing-edge/missing-authority cases.
- [x] Move viewport transform, hit-canvas dirty/scheduling and inspector initialization writes into canonical actions.
- [x] Register 12 exact RuntimeContext-retirement owner proofs. Freeze five public owner method objects while retaining internal mutable data; keep behavioral tests instead of duplicate method-key inventories.
- [x] Flatten chunk request ownership to one Map keyed by request identity. Preserve same-scene reuse, outgoing cancellation, incoming requests and late-settle protection.
- [ ] Generate the current policy against HEAD and pass current consistency/history checks.
- [x] Inspect the integrated scope and record local status without conflating full P4 admission.

The policy-generation attempt is owned only by root; command and logs are in context.md. Existing WIP remains preserved. This section supersedes the prior follow-up's policy deferral only when the pending checks actually pass.

Two full stage 1 producer attempts exited 1 without writing the generated policy. The second passed retirement-ledger construction, then failed semantic progression. Subsequent targeted repairs passed: viewport/action 36, hit scheduling 32, inspector initialization 14, five frozen owner behavior sets 44, chunk cancellation 8, registered-owner proof checks 2, and final policy retirement regressions 3. These sets overlap earlier checks and are not a unique aggregate test count. Final action preflight checked 28 modules with zero violations. Chunk known-binding scan fell from 436 to 368 with zero added semantic findings; the eight new registry-call diagnostics disappeared.

Remaining: viewport-read capability proof (seven live projection/transform or related taint hazards); remaining raw-state/reader forwarding and UI binding diagnostics; and the unit-counter catalog source/policy discontinuity introduced by committed `1f31ef7` (10 current findings versus six at its recorded checkpoint). These are not resolved by the accepted 12 owner proofs. No empty proof, scanner exemption, baseline refresh or historical-reconciliation schema was added. No third full generation or current checker was run while these known prerequisites still fail. Current generated policy remains unchanged. All agents released ownership; no long process, commit, push or deployment remains.

## Current checkpoint: follow-up priorities 1-4

The earlier deeper stages 1-4 are accepted locally and remain uncommitted on top of `348a952e`. The next four priorities have now delivered their bounded local changes. Current generated-policy synchronization is incomplete as detailed below. Earlier checklist entries describe earlier batches, not the current worktree baseline or production admission.

- [x] Retire the unused scenario activation implementation while preserving canonical action behavior.
- [ ] Synchronize the generated current writer policy; blocked by pre-existing special-zone proof gaps, outside the bounded deletion.
- [x] Remove redundant renderer source-shape assertions while retaining effective boundaries.
- [x] Reconcile P4 current status and separate active registry navigation from historical evidence.
- [x] Consolidate Supervisor execution and separate historical catalog checks from routine metadata.
- [x] Root: integrate shared metadata/package changes, inspect scoped results and record minimal validation.

No new commit, push, full P4 admission, data migration or Pages/dist change is part of this follow-up.

### Accepted follow-up slices

- Renderer tests: three worker-owned files net -436 lines, with live getter and factory behavior retained or extended; 65/65 relevant tests passed. Root removed two checker loops that locked those test files' implementation text (-49 lines); the architecture boundary check passed with real owner checks intact.
- Documentation: P4 task owns current status; plan/context and appearance-platformization summaries link to it. P4.4 is locally implemented, with formal admission unconfirmed. Registry active body shrank 1,943 -> 454 lines; its complete original evidence and 109 headings remain traceable in a single archive. Worker checked 119 registry links/anchors plus eight follow-up links. This is reduced active reading volume, not net repository deletion.
- Verification: Supervisor delegates process execution to the existing adaptive executor, retaining its command-lane planning and strict/CI/main-thread semantics. Production slice net -51 lines; there is one fewer process execution implementation. Supervisor/schema 19/19 and existing adaptive execution/authority 15/15 passed; a bounded independent review found no material regression. This does not claim migration to the full bound leaf planner.
- Current metadata and historical shadow now have separate package/canonical routes. Focused metadata/discovery/history separation 4/4 and history shadow/receipt 9/9 passed. Root route schema/discovery passed for 428 routes; portfolio passed for 340 scripts. Frozen historical catalog baseline is retained.
- Scenario legacy code/tests: net -121 lines including the correction of a pre-existing Python import prohibition to the exact current action dependencies. Canonical scenario tests 26/26, manager Python boundary 8/8, action Python boundary 7/7 passed. This number excludes necessary policy-contract/producer changes and does not claim that all of priority 1 is fully closed.
- Current policy: retain the 51 exact retirement mappings and deleted-production-path manifest correction; the final two focused regression checks passed 2/2. Producer attempts did not update the generated JSON. The existing special-zone wrappers expose source-proof gaps; independent inspection also confirmed borrowed diagnostic references in the normalizer output. Root stopped the proposed scanner expansion and restored only this follow-up's special-zone trial changes from exact before-images. The restored layer behavior passed 11/11. Generated policy and formal admission remain unconfirmed; no shallow copy or read-only input proof is treated as deep isolation.
- All task and subagent file ownership is released. Scoped diff whitespace checks passed. The new registry archive is present and untracked; include it with the documentation changes in any later commit. No producer/checker process remains, and no commit, push or release was performed.

## Earlier accepted batches

- [x] Inspect the current checkout: no pre-existing uncommitted changes; local P4.4 candidate preserved.
- [x] Dispatch two same-directory tasks and bounded internal subagents with file ownership.
- [x] Implement local verification selection and measure a representative feedback path.
- [x] Remove renderer facade registries and eliminate the special-zone cycle.
- [x] Consolidate border dirty/timer/cache ownership within the renderer/mesh/draw chain.
- [x] Run focused runtime integration checks and review material regression risks.
- [x] Report net structural change, actual timings, and remaining validation gaps.

## Validation so far

- Special-zone behavior: 42/42, 439 ms. Facade-related owner behavior: 38/38.
- Border lifecycle and draw behavior: 14/14, 191 ms; debounce replacement/cancellation, disabled rendering, and stale-detail snapshot invalidation covered.
- Public API and border ownership checks: 9/9, 3.74 s; retained click-transaction behavior: 1/1, 122 ms. Retired the obsolete duplicate water-source-shape assertion and fixed named-import alias handling after confirming both original failures against HEAD.
- Core runner: 89/89, 55.12 s. Metadata: 45/47 before updating two stale expectations, then the affected two tests passed in 0.26 s without repeating the 107 s suite.
- Bounded review found no material regression. Explicit reserved core retains the prior 91 commands; default core selects 81, main-thread selects 95.
- Complete `npm run -s verify:edit -- --changed-files js/core/renderer/border_mesh_owner.js,js/core/renderer/border_draw_owner.js`: exit 0, 6.006 s wall time, two commands, 14 tests passed, no unmatched files or local route gaps. Evidence: `.runtime/reports/generated/feedback-npm-edit.json`, `.runtime/tests/feedback-npm-edit.log`.
- New canonical local routes and their retained legacy projection now agree. The renderer-splits action import source reference was also synchronized. Shadow equality and portfolio checks passed; the drift-diagnostic test and existing negative drift test passed 2/2 in 0.82 s.
- Production JS net change: -414 lines, including deletion of four facade files. Renderer imports 111 -> 107; renderer lines 20,388 -> 20,322. Local routes added for 13 action modules and two border owners; these are bounded development feedback, not equivalent to full historical admission.

No commits, pushes, builds, browser/performance or full-P4 runs performed.

## Remaining boundaries

Full P4 policy baselines/admission, Pages mirrors/build, and browser/performance/release validation were not regenerated or run. The retained legacy projection remains present; this batch fixes its actual synchronization failure rather than pretending it has been retired. Other large renderer/sidebar domains and project-restore writes remain outside this bounded batch.

## Second batch

- [x] P1: retire duplicate verification metadata maintenance and check independent coverage.
- [x] P2: simplify renderer source-shape tests with existing behavior coverage.
- [x] P3: consolidate sidebar country model ownership and reduce callback surface.
- [x] P4: reduce actual ordinary-check governance triggers while preserving explicit full-proof paths.
- [x] Root: integrate shared entrypoint needs, inspect diffs and run necessary focused cross-lane checks.

### Second-batch results

- P1: domains 3,342 -> 97 lines; removed duplicate route/supersession definitions and routine portfolio shadow comparator. Independent actual package/E2E/heavy-manifest route coverage remains. Route validation builds the shared command set once per check. The 135-line historical documentation/supersession snapshot is frozen and is not a second routine maintenance source.
- P2: five renderer Python contract files 508 -> 267 lines and 237 -> 49 assert calls compared with the start of this batch. Kept dependency/transaction boundaries and same entrypoint files. Related Node behavior 46/46 plus viewport 6/6; Python initial 6 passed, two stale shape failures repaired, affected helper 2/2 passed.
- P3: sidebar root 6,450 -> 6,047 lines, controller removes six injected model callbacks. New model 426 lines; production slice is net +28 lines, with actual responsibility consolidation rather than a net-deletion claim. Model/controller/HGO 15/15, Python sidebar boundaries 10/10.
- P4: registered non-control-plane JS-only commit changes retain import integrity and adaptive execution, dropping portfolio/selector preflights (4 -> 2 top-level commands). Mixed unknown/test/data/config changes retain global checks. Focused positive/negative tests 7/7; missing local coverage still exits 2.
- P1 checks: portfolio/historical projection 63/63; metadata targets 3/3; 424 route schema and independently discovered coverage passed.
- Root actual npm integration: same two-border `verify:edit` command passed 14 tests in 3.364 s vs prior 6.006 s. This is a single local before/after observation, not a repeated benchmark or proof of all-workflow speedup. `.runtime/tests/feedback-round2-edit.log` and `.runtime/reports/generated/feedback-round2-edit.json`.
- Root actual `verify:commit` selecting the new country model and controller passed import integrity plus 14 behavior tests in 3.353 s. `.runtime/tests/feedback-round2-commit.log`.
- Whole current diff whitespace check passed. No full P4, performance/browser/build, CI, commit or push. Sidebar expansion writes moved paths; formal writer policy/admission has not been refreshed.

### Review corrections and final acceptance

- Fixed Python package-script discovery omission, including covered aliases/aggregates and negative fixtures. Registered three genuinely missing Python command groups without executing their heavy suites; final schema/discovery covers 427 routes.
- Removed default current-versus-frozen historical equality requirement. A legitimate new documentation ref now yields a valid current projection and an explicit historical drift report while leaving the snapshot unchanged.
- Three affected regression checks passed in 328 ms. Root inspected both corrections and reran the affected complete npm border edit entrypoint: exit 0, two commands / 14 tests, 3.365 s. Final diff whitespace check passed. This final rerun was necessary because discovery/catalog changed after the first integration check.
- Four implementation tasks are complete and idle. This batch is accepted locally; all production-release and formal historical-admission gaps above remain explicit.

## Third batch

- [x] Expand bounded local behavior routes for existing renderer/UI owners and integrate new test entrypoints.
- [x] Extract six commit-runner tests into an independent file while preserving full-entrypoint coverage.
- [x] Consolidate HOI4 catalog loading/review/card lifecycle within existing sidebar owners.
- [x] Finish renderer candidate selection and execute the chosen bounded responsibility, if justified.
- [x] Root: inspect actual reductions, integrate cross-lane route needs and run minimal final checks.

### Third-batch results

- Eight new local records: ocean, actual viewport owner, hover, city lights, diagnostics, commit runner, HOI4 catalog helper and retired-frontline test. 435 route schema/discovery and portfolio checks passed. Wide renderer/sidebar roots and the broader unit event binder are not falsely attributed to these limited suites.
- Six commit tests moved from the mixed core-runner file; three classification regressions added. Canonical control-plane record IDs reference the dedicated commit record and infrastructure record, preserving the full core-runner package/local-infra/control-plane test combinations without duplicate test files. This does not expand the separate project-wide verify:core group selection.
- HOI4: sidebar 6,047 -> 5,733 lines, four production files net -38 lines and ten fewer root service/callback injections. Six mocked lifecycle/event behavior cases passed, Python strategic sidebar 11/11. No visual performance claim.
- Retired frontline: removed 158 unreachable renderer lines after verifying the real mesh provider always returns null. Retained cleanup, persisted state and manual operational lines. New cleanup behavior plus existing scheduler 7/7.
- Existing five-owner suites 62/62 passed. Metadata selection targets 3/3 passed. Commit classification targets initially 9/10; removed residual broad source references and the affected classification target passed.
- Bounded review found two stale cost/count expectations after the new commit test leaf. Reviewer ran the framework files (140/142); root corrected only those expectations, retained existing budget limits, added exact-once commit-leaf assertions and reran the two affected cases (2/2, 967 ms). No other material review finding remained.
- Actual npm integration for commit runner + ocean + catalog helper passed 21 tests / three commands in 4.002 s, zero unmatched files or route gaps. Evidence: `.runtime/tests/feedback-round3-edit-final.log` and `.runtime/reports/generated/feedback-round3-edit-final.json`. Executed command durations totaled 945 ms; wall time includes preflight/planning/process/report overhead.
- A four-command edit attempt correctly stopped before execution at the existing three-command/90-second estimated budget (estimated 100 seconds). Impact also rejected this dirty explicit-file use because it requires a clean historical base. Neither attempt ran product tests or justified relaxing gates; final integration used three edit paths and retained the independent frontline checks.
- Final whitespace check passed. All work remains local and uncommitted; no full historical P4, browser, build, CI or release validation performed.

### Remaining priorities

Next investigate fixed local cost estimates and the edit/impact experience for ordinary multi-file WIP. The current estimate is 25 seconds per fast one-test process, while observed representative commands were 295-331 ms. Do not change formal historical admission by accident. Two pre-existing non-indivisible core-runner local source mismatches (selector/profile) remain outside this batch. Domain organization of the 19k-line catalog and larger sidebar preset/scenario state slices remain later candidates.

## Fourth batch

- [x] Organize authored catalog by domain and isolate normalization algorithms.
- [x] Update dependency consumers and focused regression cases for exact module paths.
- [x] Review module boundaries and update existing editing/navigation documentation.
- [x] Root: compare full normalized semantics against the preserved before image, inspect scope and accept bounded integration checks.

Baseline: 476 records and 435 routes. Complete normalized before image is `.runtime/tmp/catalog-organization/source-before.json`; it is temporary evidence, not a second tracked source of truth.

### Fourth-batch results

- Public source 19,050 -> 72 lines; 21 internal modules separate domain records, policies/scripts and normalization/gate algorithms. Largest module is state ownership at 1,928 lines; the seven renderer files are each at most 1,643 lines. Combined source is 19,189 lines (+139): this is organization and ownership improvement, not net code deletion or measured execution speedup.
- Root's full normalized comparison passed: all 476 records, 346 scripts, numeric order/policy fields and eight public exports preserved. Only the five existing root-owning records add the 21 new module paths. The exact path manifest includes itself and is reused by P4 ownership and scenario evidence inputs; commit runner required no change.
- Four new consumer cases passed in 3.669 s, covering every manifest path for edit/impact, commit and P4, real file-list completeness and historical input changes, plus unknown/similar-path negatives. They build plans without executing heavy workflows.
- Root's four existing normalization/projection/gate cases passed in 1.159 s. Independent route schema/discovery check passed for 435 routes. Tracked whitespace check passed; new catalog modules have no trailing whitespace.
- Existing navigation documentation now points to the domain files and explains index/order and shared manifest maintenance. Bounded review found no internal reverse import or duplicate business authority. Three historical heavy Python records remain in the local-feedback constructor with their original full/main-thread policy and explicit documentation; no extra ordering refactor was introduced.
- All changes remain local and uncommitted. No full P4, browser, build, CI, release or performance validation was performed. Prior batch WIP is preserved.

## Local integration and commit review

- [x] Review renderer/state and sidebar changes across all four batches.
- [x] Review verification routing, core defaults, commit selection and catalog integration.
- [x] Fix verified lifecycle/selection residuals and clarify stale core documentation.
- [x] Commit renderer/state and sidebar as separate rollback boundaries.
- [x] Prepare the verification infrastructure and records as the final local commit.

Review fixes: legacy enabled frontlines now clear their unused label caches; closing the HOI4 catalog cancels outstanding card frames through the controller and closed refresh; core runner edits use their declared aggregate coverage instead of broad test-routing fallback, resolving the two previously deferred selector/profile source mismatches. `docs/testing/verify-core.md` now distinguishes child-safe default, reserved and main-thread plans and removes obsolete fixed command counts and default-dist instructions.

Final affected checks: retired-frontline 3/3; catalog lifecycle/event suite 7/7 after a failing close regression reproduced the bug; new core-routing regression 1/1; split-catalog and existing owner-selection cases 2/2; existing negative source-mismatch case 1/1. The first routing test also assumed docs had a local execution route; the planner correctly reported no eligible coverage, so the final regression asserts the actual core-runner fix only. Docs retain their direct PR route and need no local project test. Import graph passed for 51 specs with no tracked generated change; portfolio check passed for 346 scripts; schema/discovery passed for 435 routes. No complete framework, P4, browser, dist build, CI or release run was added.

Local commits: `3092b17e` contains renderer/state changes and `1f31ef7e` contains sidebar ownership/lifecycle changes. The final infrastructure commit contains all remaining catalog modules, frozen historical snapshot, tooling/tests and these records. Prior batch references to uncommitted work describe those earlier checkpoints; this section is the current closeout status. Remote push and main promotion are not part of this local commit round.

Remaining bounded opportunities: overlapping control-plane and adaptive checks for shared catalog changes, and calibrated local test-cost estimates. They require a separately verified command-coverage change; this round does not silently drop either check set. Generated dist and formal P4 admission remain at their prior state.

## Deeper stages 1-4

- [x] 1A: retire renderer context intermediary, preserve effective owner contracts.
- [x] 1B: consolidate hover transient state and scheduling.
- [x] 2A: consolidate Project support diagnostics mounting.
- [x] 2B: consolidate Quick Fill responsibilities.
- [x] 3: deduplicate execution and simplify lightweight versus historical verification.
- [x] 4A: separate scenario quick/heavy import dependencies.
- [x] 4B: cancel obsolete scenario requests without breaking shared reuse or generation safety.
- [x] Root: review each stage, integrate shared authority and run minimal sufficient checks.

1A accepted locally: removed the 823-line context module, 287 renderer-root lines, seven dedicated tests (1,928 lines), seven package scripts and fourteen canonical records. Thirteen real owners retain lazy direct wiring, original state/host identity, live accessors, this binding and cache collection-copy semantics. Three new actual-root factory cases live in the existing surface-host suite. Renderer behavior/inventory 202/202; affected Python boundaries 38/38 plus final cache target 1/1; root metadata/core plans 7/7, architecture, syntax, import graph, portfolio, route discovery and diff checks passed. Independent review found no material issue in production, tests or catalog. No browser/full core/P4/dist run or runtime-performance claim. Stage 1B root/owner/test before images are temporary review aids in `.runtime/tmp/deeper-stage1b-before/`.

1B accepted locally: renderer root 19,877 -> 19,734 (-143), hover owner 255 -> 360 (+105), production slice net -38; hover behavior tests 364 -> 182. Callback inputs 28 -> 15; shared hover state remains on the original runtime object, while facility hover and frame scheduling live in the existing owner. Removed unused per-move trace arrays. Behavior covers coalescing, frame handle zero, live external state/tooltip, selected-facility fallback, leave/reset cancellation, late callbacks and matching RAF/timer cancellation. Owner 15/15; inventory 7/7; startup/reset/surface batch 42 initial passes and one stale line-budget assertion subsequently corrected and passed; actual-root reset wiring 1/1; scenario heavy case 33 only 1/1; affected Python 19/19. Syntax, architecture and whitespace checks passed. Independent production and final-increment reviews found no material issue. Stage 2A is released next; full historical/browser/dist checks remain outside this local acceptance.

Stage 2 accepted locally: Project/diagnostics root loses 406 lines and 29 leaf-node injections, passing four hosts to the existing controller; production slice net -44. Quick Fill policy/labels/visibility/events join the existing popover controller; toolbar root loses 97 lines, slice net +4. Project behavior 28/28 (24 preserved plus four mounting cases), Python source boundary 9/9 and final affected method 1/1; Quick Fill new behavior 5/5 and three source Python methods 3/3. Syntax/whitespace checks passed. Root exact local-owner edit/impact selection including broad-toolbar negatives passed, and route discovery covers 422 routes. No extra npm forwarding alias. Independent review found no material issue in either slice. DOM fixture evidence covers input preservation, idempotent mounting/binding/session probes, body ownership, focus and ARIA; browser/layout and dist remain unverified.

Stage 3 partial acceptance: 3B isolates five command-supersession and three state-action source-boundary cases into small registration modules/direct entries. Eight targets passed in 256 ms; static expanded AST/name/order comparison preserves all 85 core and 144 manifest tests, with unchanged P4 guard/cache/runner identity and no full historical execution. Core commitProjection schema target passed separately. 3C removes 279 lines of P2 historical document and meta-test shape locks while preserving live owner/public/state-write boundaries; inventory 9/9 and architecture passed. Both slices passed independent review. Root added only exact contract-module/direct-entry routes (no broad production-helper coverage), migrated metadata's control-file assertion to canonical command-plan expansion, and passed owner-route selection plus 424-route discovery. Stage 3A duplicate execution remains in progress.

Stage 3 final acceptance: commit now validates the original product selection/budget before merging fixed canonical controls into one existing leaf plan. Mixed infrastructure execution contains six distinct Node files, structural Python and standalone selector once each, with both source roots retained for the four previously repeated Node files. Required PR-depth controls remain separate from product recommendations; main/CI/platform/resource restrictions and unknown/budget failures remain enforced. Final commit runner 16/16, existing adaptive execution 14/14; independent review found no material issue. Root real `npm run verify:commit -- --changed-file js/ui/toolbar/workspace_chrome_support_surface_controller.js` passed import graph plus five behavior tests in 2.433 s (one local run, not a broad benchmark).

An existing budget bug was also fixed without increasing limits: local-infra previously estimated 95 s/3.25 cost and could not fit edit's 90 s/3 budget. Its metadata suite now directly runs both original route-schema/discovered-coverage validators, so its redundant standalone selector process retires from local eligibility; the explicit selector command remains in commit/core/PR. Local-infra is now six leaves/two groups/70 estimated seconds/2.5 cost, with strict leaf equivalence preserved. The package.json combination still estimates 95 s/3.25 and correctly remains blocked by the original edit limit. Inventory target 1/1 and four affected plan/depth tests 4/4 passed. All package scripts remain classified (339), whitespace passed. No full infra/core/P4, browser or dist run was added.

Stage 4A accepted locally after independent bounded review: full aggregation 4,740 -> 35 lines; quick/heavy bodies now live in their own case modules and wrappers import only their partition. All 79 names/order and 58/21 partition remain; independent AST comparison against HEAD found 78 bodies unchanged and only the already accepted 1B hover case 33 changed. Removed copied unused imports and historical body-LOC/regex-count locks. Shared helper remains shared because quick uses its actual utilities; no extra helper hierarchy. Quick 58/58 and shadow behavior 6/6 passed; no full heavy/shadow assets executed. Root bound actual case files in catalog and shadow input identities; exact edit/impact partition route target passed. 4B cancellation review remains in progress.

Stage 4B accepted after independent review and one material repair: outgoing-scenario cancellation reaches native fetch and per-task worker decode; same-bundle reset retains its promise, abort skips worker fallback, failed/aborted promises can retry, and stale completions cannot overwrite a retry. The reviewer reproduced same-ID bootstrap/full bundle replacement leaving a newer request uncancelled. Final ownership is a private Map containing only this controller's in-flight bundle requests plus an active scenario ID; leaving a scene cancels all its in-flight bundle versions, preserves incoming-scene work and completed cache, and settlement removes empty maps. Single-task worker cancellation clears timeout/listener/pending state, ignores late replies and does not terminate the shared worker; actively cancelled decode emits no READY or ERROR. No generic cancellation framework or new configuration knobs were added.

Final affected evidence: scenario cancellation 8/8 (about 209 ms), original quick 58/58 (about 275 ms), then four impacted generation/reuse targets passed after the same-ID fix; worker client 9/9 and worker VM cancellation 1/1 passed after final worker changes. Shared helper only gained optional fixture injections with unchanged defaults. Root local owner/inventory targets 2/2, split routing target 1/1, import graph (51 specs), architecture and whitespace checks passed. Current catalog: 339 package scripts, 468 records, 427 routes. The two new narrow cancellation test entries cover their own files; only the existing worker task client suite gains a corresponding local owner route, with no claim of whole data-loader/startup coverage.

All deeper stages 1-4 are now integrated locally and remain uncommitted on the current branch, preserving prior commits and unrelated worktrees. Final root sizes: renderer 20,164 -> 19,734; sidebar 5,733 -> 5,327; toolbar 3,101 -> 3,004. The scenario aggregate 4,740 -> 35 lines is physical relocation with original test bodies retained, not a 4,705-line test deletion. Native fetch/worker cancellation is proven by target fixtures; the legacy D3 branch can only discard a result after it settles, and synchronous JSON CPU work is not interruptible by this change. No browser runtime benchmark, full heavy/P4, dist build, remote CI, push or release was performed. The 2.433 s local commit run above is one scoped observation, not a universal development-speed benchmark.


## Stage 1 state-writer policy closeout (2026-09-06)

Completed locally. The existing builder passed progression, semantic authority, retirement ledger and schema checks and atomically regenerated tools/state_writer_policy.json. A fresh standard CLI run, `node tools/check_state_writer_policy.mjs --phase P4.4 --json-out .runtime/tmp/stage1-closure-20260906/policy-report.json`, exited 0 with verdict pass, zero violations, zero unknown candidate bindings and zero stale policy bindings. This final run injected no inventory or historical-proof cache.

Repairs distinguish borrowed state from local values while preserving runtime object identity; move the two actual HGO variant mutations into the existing presentation action; keep hover land ownership in renderer interaction and delegate water/special IDs to presentation; preserve historical recordedInPhase during cross-file adoption; and align checker/worker historical replay with the trusted previous-policy baseline. The current policy cannot seed its own proof. Worker failures now retain their original error while invalid envelopes remain rejected.

Against the unchanged P4.4 checkpoint: production legacy memberships 856 -> 779, alias sites 139 -> 122, dynamic sites 119 -> 119, ambiguous diagnostics 598 -> 351, unsupported diagnostics 3725 -> 3242. Direct legacy production files remain 75. Caller-to-action retirement entries increased from 332 to 410. Frozen legacy semantic/site/membership baselines, historical checkpoints, diagnostic budget and closeout targets were not raised or refreshed. Diagnostic reductions include improved analysis precision and must not be described as equivalent counts of runtime bugs removed.

Relevant checks passed: scanner soundness 41/41; final hover and delegation 59/59; renderer interaction actions 10/10; country controller 8/8; HGO exact dynamic-path admission target 1/1; cross-phase ledger adoption 1/1; worker protocol and trusted-previous/forged-current regression 11/11; existing frozen-source recompute 1/1; dedicated historical-worker boundaries 5/5. Earlier affected viewport, border, country-model, optional-layer and Quick Fill checks are recorded in context.md. The final focused proof regressions used the official exported runner with separate .runtime output paths, preserving stale failed-run artifacts.

All changes remain local and uncommitted. This closes the state-writer policy gate for the integrated work; it does not claim complete P4 admission, browser validation, dist regeneration, remote CI, push or publication. Final evidence: policy-report.json and checker-final-2.log under .runtime/tmp/stage1-closure-20260906/.

Default focused-runner availability is restored: after confirming the failed run was finished and no focused process was active, root moved its two leftover running outputs into the current .runtime task directory without deleting them. The ordinary npm focused command then passed the trusted-previous checkpoint regression 1/1. No stale active-run artifacts remain from that failed invocation.


## Renderer wave — legend lifecycle and water signature reuse, 2026-09-06

Completed locally. The complete floating legend DOM, drag/resize/opacity lifecycle and rendered-content cache now live in legend_control_owner.js behind the unchanged renderer renderLegend facade. One resize-handle recipe replaces three copies. Real old-source reproductions fail for hidden-update stale content, initial-hidden empty content, container replacement, language change and delimiter-collision labels; new owner tests pass. Hiding/closing/replacing the container stops document drag/resize listeners.

The water signature now shares only its synchronous invocation's effective-water count and Atlantropa buckets/token. Real before/after seven-configuration comparisons preserve signature bytes and identity allocation order. Instrumented calls per water revision: effective-water composition 2 -> 1, Atlantropa classification 4 -> 1, Atlantropa token 2 -> 1; physical mask remains 1. In-place data changes are observed on the next call. No persistent cache or new invalidation scheme was added, and no FPS/frame-time improvement is claimed.

Scope: map_renderer.js 19,780 -> 19,327 (-453); new legend owner 491 lines; combined production +38 lines. Root preserved pre-existing changes and owns the facade/catalog integration. Behavioral evidence: legend 20/20 and water signature 8/8 through real verify:edit routes; existing legend/SVG/render-lifecycle 28/28; public facade Python 6/6; two focused heavy scenario contracts pass. Portfolio/434 routes, syntax and scoped whitespace pass. Read-only review found no material issue.

Local browser loaded HOI4 1939 and exercised real public-facade cache reuse and hidden updates, plus actual collapse/expand, drag (+41,-29 CSS pixels) and opacity (0.65) controls. Console had zero errors/warnings. Browser session and owned port8000 server stopped; .runtime/browser/renderer-wave-20260906/ holds scripts and snapshots. Browser did not benchmark complex water geometry; VM signature tests stub geometry sanitization/diagnostics while exercising actual renderer token functions.

Broader architecture checker is NOT green: two unchanged before-source mismatches remain. Its P38 check demands a direct hitCanvasDirty assignment although before already delegates to setHitCanvasDirtyState; it also forbids projection.scale() || 0 although the before viewport factory already contains that read. This wave does not edit those unrelated sites or weaken that checker. Full policy regeneration/admission, all-project qualification, commit/push and publication were not performed.

## Renderer round2 — projected bounds and spatial preparation, 2026-09-06

Completed locally across four existing renderer modules. Projected-bounds merge now uses one pass instead of filter plus four map/spread operations; the 150,000-entry RangeError is fixed. Coordinate fallback traverses nested FeatureCollection/GeometryCollection, and missing nested path-bounds endpoints fall back rather than throwing. Bounds/cache/spherical water behavior remains under the same owner.

Primary index preparation now directly fills the bounds cache using one land/river recipe. Removed the unused deriveRuntimePrimaryFeaturePayload export and its discarded culling result. Actual spatial-item construction still performs culling; only the earlier duplicated diagnostic/culling work was removed. Without a target bounds cache, the preparation phase does not compute disposable geometry. Bounds are recalculated on subsequent builds rather than reused across generations.

Water spatial construction computes whole-feature fallback lazily once per feature per call, including null results. Safe part bounds still take priority, unsafe parts are excluded before computing, and part IDs/order/source/bbox behavior is preserved. Three missing parts now require one whole-feature fallback instead of three. No persistent cache or new invalidation scheme was added. Four production files total -3 lines; this round targets concrete work reduction and correctness rather than root-file relocation.

Verification: projected bounds 16/16, spatial owner/builders 7/7, scenario quick 58/58 through actual verify:edit execution, and focused Atlantropa interaction contract 1/1. The initial four-file edit selection exceeded the unchanged three-command budget; separate geometry and spatial invocations executed the required targets. Portfolio and 437-route checks passed. Runtime-state behavior suite was also exercised after retiring its old derivation-only test portion; bounds population is now asserted through the actual spatial owner tests.

Target Python checks exposed stale source-location assumptions in two existing methods. They now verify the actual root-to-setMapData/reset/hover owners, preserving clear/reset order, conditional cancellation and reduced-hover-before-hit behavior. Those two files pass 12/12; the additional runtime-state boundary file passed 5/5. Independent review found no material issue and ran the combined 23 behavior checks successfully. Scoped whitespace passes.

No browser or FPS benchmark this round: direct geometry/index behavior checks support these changes. No new global architecture/policy acceptance is claimed; previous round's two broader architecture mismatches remain outside this scope. All work is local/uncommitted, with unrelated WIP preserved. No server, pending test process, policy producer, remote CI, commit/push or publication remains from this round.

## Renderer round3 — selection ownership, exact merge and projection boundary, 2026-09-06

Completed locally. Selection overlay rendering, signature/cache checks and topology merge preparation now live in selection_overlay_owner.js; map_renderer keeps state/host wiring and four small delegates. Development selection and Inspector keep their distinct visual/grouping behavior while sharing ownership. The same-count topology merge bug was reproduced using requested [a,b,c], displayed fallback [a,b] and topology [a,c]: the old implementation wrongly merged [a,c]. New merging matches displayed feature IDs one-to-one, rejects missing/duplicate/cross-object ambiguous IDs and retains the original fallback features. Missing drawing surfaces no longer mark overlays clean; changed group/path references and Inspector labels invalidate correctly. JSON signatures avoid ID delimiter collisions.

Projection signature formatting moved from the root factory into the viewport read-model owner; the root passes a detached scalar/translation snapshot. Original defaults, numeric coercion, rounding and current-value reads remain. The P38 architecture assertion now requires the already canonical setHitCanvasDirtyState action rather than a retired direct assignment. The existing rule forbidding projection signature logic in root remains unchanged and now passes. Both previously recorded architecture mismatches are resolved by this round.

Water fill now increments renderedCount only after a valid whole/part/canvas path fill; the no-Path2D/no-canvas empty-path case no longer calls fill. The actual old function failed both no-path regression cases; the fixed function passes them while preserving successful rendering and one-count-per-feature semantics. No persistent cache, compatibility layer or policy budget exception was introduced.

Validation: actual verify:edit executed 3 commands covering selection19, viewport14 and water-fill6 (39/39). Added narrow local coverage for viewport/selection and water-fill test; the initial viewport edit command had no eligible local route and executed nothing before that route was added. Portfolio/440-route schema, 10 existing surface/SVG checks, 5 Python state/selection boundary checks and 2 focused water/Atlantropa contracts pass. Independent review ran 39/39 and found no material issue. Final architecture, syntax and scoped whitespace pass. Renderer 19,327 -> 19,205 (-122); new selection owner209 lines, so the result is clearer responsibility boundaries and fixes, not a net code-deletion claim.

Local Playwright used the real public facade to select AFG-1741/AFG-1742, produced two dev fallback paths and one grouped Inspector path with exact selected IDs and a nonempty SVG path, checked the label and cleared both overlays. Console0 errors/0 warnings. This browser case proves fallback/group integration, while exact topology-merge edge cases are covered by the owner regressions; no FPS or rendered-water pixel benchmark was run. Artifacts: .runtime/browser/renderer-round3-20260906/ and the round3 tmp directory. Owned browser/server stopped; no pending test process. All changes remain local/uncommitted, preserving other WIP. No full state-policy regeneration/admission, remote CI or publication was performed.

Closeout in progress (2026-09-06): independent scenario/renderer and final boundary review PASS. Final official verify:core passes all74 commands; all eight repaired boundary groups pass162 targeted checks. The semantic state-write allowlist/startup restoration tests pass9, and the selection exact owner proof rejects getter/factory/facade drift. Renderer module inventory decreases1314->1292 with no added identities. An unsound experimental borrowed-reader exemption was removed before integration.

Pages verification passed92 tests; final source was subsequently rebuilt to tracked dist (913.83MiB), with final changed renderer mirrors checked4/4. Root is running the official policy producer against HEAD without baseline refresh; the standard checker remains pending. No full policy PASS or formal B admission is claimed yet. Protected main requires six named checks through a PR; no merge/push yet. Personal .codex/config.toml is excluded. Recovery patch and untracked copies are retained under .runtime/tmp/optimization-closeout-20260906/. Seven independent-commit worktrees are retained; only proven merged/ancestor-only branches and worktrees are cleanup candidates.

Closeout strict-mode correction: producer attempt3 returned12 diagnostics (6 unique), all in water signature alias flow and the river callback. A module scan with default options did not reproduce every strict-mode diagnostic, so its earlier zero-added statement was not sufficient policy evidence. Root now uses scanStateWriterBindingInventoriesBatch with its canonical STRICT default and verifies every rejected identity is absent. Renderer1314->1283 versus the initial scan, no new identities; all five rejected root identities absent. Spatial HEAD46->46, no added identities.

Final water optimization deliberately passes only numeric counts across the signature boundary: water composition2->1, Atlantropa classification4->2, revision token2->1 per call. It preserves signature bytes, identity order, no-argument behavior and invalidation, and avoids a borrowed-container exemption. Signature8 and heavy2 tests pass; river behavior5 passes. Independent final review PASS. Core74 passed before these final focused repairs, and their affected target tests were rerun afterward.

Root sole producer attempt4: node tools/build_state_writer_policy.mjs --phase P4.4 --previous-policy-revision HEAD --write, log policy-build-4.log. Source and policy configuration frozen. Root separately rebuilds tracked dist with the existing official builder, log pages-final-2.log. No shared port or browser. Full policy checker still follows successful generation; no source admission, remote check or merge is implied by these preflight results.

Official producer attempt4 PASSED (exit0), writing tools/state_writer_policy.json with213 writers. The regenerated state-write allowlist projection also passes118 registered/73 observed files; scoped whitespace is clean. Root is now the sole owner of the standard checker: node tools/check_state_writer_policy.mjs --phase P4.4 --json-out .runtime/tmp/optimization-closeout-20260906/policy-report.json; log policy-check-final.log. Await its final verdict before commit. No source/config edits during the checker.

Final local closeout accepted: official producer exit0 and standard P4.4 checker PASS with zero violations (75 production +43 test legacy-direct files). Core74 commands passed; final water8/heavy2/spatial5 targets and independent review cover subsequent narrow repairs. Pages92 checks passed and final source/dist rebuilt and matched. These are local integration checks; formal B admission and remote CI remain separate. Final cleanup audit proves5 previously divergent worktrees patch-equivalent to HEAD, in addition to ancestor-only da5f: retain only b52a and d081. No matching live processes; ignored historical output backed up under closeout/worktree-artifact-recovery before deletion. Personal .codex/config.toml stays excluded.
