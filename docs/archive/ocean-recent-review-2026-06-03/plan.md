# Ocean Recent Review 2026-06-03

## Scope

Review the recent TNO ocean refinement chain from `e94c6e4b` through `fb33f2c2`.

Covered areas:
- Source-backed water replacement and split data.
- `water-only` bundle publication path.
- Water refinement audit and source-review metadata.
- Focused geometry, topology, manifest, startup bundle, and test contracts.

## Acceptance

- Recent water commits have been reviewed against the current repository state.
- Independent review lanes have checked correctness and architecture boundaries.
- Confirmed issues are fixed with the smallest safe patch.
- Water audit, geometry validation, targeted contracts, and relevant unittest coverage pass with fresh evidence.
- Worktree changes are committed, pushed, and the temporary worktree is cleaned up.

## Tasks

- [x] Establish clean worktree and task notes.
- [x] Map recent ocean files and commit range.
- [x] Run independent read-only review lanes.
- [x] Inspect audit/source-review/publication contracts directly.
- [x] Fix confirmed defects.
- [x] Run focused validation.
- [ ] Commit, push, and clean the worktree.

## Result

The review found one concrete data defect in the recent ocean chain:
`tno_english_channel` still overlapped `tno_strait_of_dover` by
`0.0007657138939417039` after the source-backed child split. The fix tightens
the final named-water exclusion path with a small buffer, refreshes the
checked-in water-only artifacts, and adds the missing non-overlap contract.

The review also exposed a test discovery gap: several recent plain `test_*`
functions were only reachable by direct module execution. They are now wrapped
by named `unittest.TestCase` suites so targeted CI and agent validation can
invoke the recent water contracts by class name.

Delivery note: commit, push, and temporary worktree cleanup happen after this
archive update.
