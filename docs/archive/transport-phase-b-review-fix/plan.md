# Plan

1. Verify each review claim against current code.
2. Fix country overlay state so applied overlays are kept per family and renderer reads that shape.
3. Fix pack selector so preview selection does not clear applied main-map overlays before Apply.
4. Classify road sidecar labels conservatively when road_class is missing, using explicit priority when present.
5. Add/extend tests for all three regressions.
6. Run targeted verification, archive this task doc, commit, merge back to main, and remove the worktree.

Status: all steps complete. This archive records the review fix and verification commands.
