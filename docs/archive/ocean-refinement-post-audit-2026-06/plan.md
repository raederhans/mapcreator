# Ocean Refinement Post-Audit Plan

## Goal

Audit the just-merged TNO ocean refinement, fix concrete defects, and define a practical path for slimming checked-in/generated build artifacts.

## Constraints

- Work in an isolated worktree based on `origin/main`.
- Keep this task scoped to ocean-refinement correctness and generated artifact size governance.
- Preserve canonical input/output boundaries.
- Use official/upstream guidance for GitHub repository limits and Git LFS tradeoffs before recommending artifact storage changes.
- Main agent owns live validation commands.

## Acceptance Criteria

- Review the latest ocean-refinement merge diff against code, tests, and checked-in artifacts.
- Fix any confirmed defect that is local and safe to repair in this task.
- Add or update tests/docs so the defect stays closed.
- Record an artifact slimming path with concrete files, risks, and recommended phases.
- Run targeted validation and read outputs.
- Run an independent final review lane.
- Commit, merge to `main`, push, and clean the temporary worktree when complete.

## Execution Checklist

- [x] Create isolated worktree and task docs.
- [x] Gather official/upstream evidence for large-file constraints and artifact storage options.
- [x] Audit latest ocean-refinement diff and generated artifact sizes.
- [x] Fix confirmed issues.
- [x] Document artifact slimming path.
- [x] Run targeted validation.
- [x] Run final review and fix findings.
- [x] Prepare branch for commit, merge, push, and worktree cleanup.
