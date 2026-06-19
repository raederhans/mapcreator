# Render Fluidity Post-Audit Plan - 2026-06-19

## Goal

Audit the integrated P4/P5 render-fluidity changes, fix concrete regressions, verify source/dist parity, and keep `origin/main` plus the delivery branch current.

## Steps

- [x] Create a clean audit worktree from `origin/main@da191163`.
- [x] Review recent renderer, worker, packet, layer, perf, test, and dist changes.
- [x] Fix the bitmap-ready render path so accepted worker bitmaps bypass the main-thread political background fill.
- [x] Run targeted syntax, node, contract, import graph, Pages dist, and diff checks.
- [x] Run final code-review pass.
- [x] Commit, push, fast-forward `origin/main`, update recovery notes, and clean the temporary audit worktree.

## Live Process Ownership

Main Codex agent owns all live verification commands. Review subagents are read-only static reviewers.
