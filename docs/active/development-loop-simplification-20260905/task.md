# Implementation status

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
