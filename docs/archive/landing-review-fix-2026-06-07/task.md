# Landing Review Fix Task

## Goal

Audit commit `0f157036` for bugs introduced by the landing + README polish, fix actionable findings, verify the Pages delivery surface, then merge, push, and clean the temporary worktree.

## Scope

- Review landing homepage code, generated assets, README wording, Pages dist contracts, and resource generation scripts touched by `0f157036`.
- Keep fixes scoped to real findings from the review.
- Keep `.omx/metrics.json` in the parent checkout untouched.

## Live Process Owner

- Main agent owns all tests, builds, browser/server processes, and log interpretation.
- Subagents may do static analysis only.
