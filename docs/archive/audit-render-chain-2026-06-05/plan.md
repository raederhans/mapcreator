# Plan

- [x] Load automation memory, project rules, lessons learned, and relevant skills.
- [x] Create an isolated audit worktree from current `HEAD`.
- [x] Define scope as local commits ahead of `origin/main`.
- [x] Review changed files and generated artifact contracts.
- [x] Fix confirmed issues with the smallest safe patch.
- [x] Run targeted verification owned by the main thread.
- [x] Run final review / bug / first-principles check.
- [x] Archive this task folder after completion.
- [x] Prepare the audit branch for commit, merge, push, and worktree cleanup.

Acceptance checks:
- `npm run -s test:node:scenario-chunk-contracts`
- `npm run -s test:node:scenario-lifecycle-runtime-behavior`
- `python -m unittest tests.test_scenario_chunk_assets tests.test_startup_bootstrap_assets -q`
- `node --check` on changed JavaScript and MJS files.
- `python -m py_compile` on changed Python files.
- `git diff --exit-code --no-index js dist/app/js`
- `npm run -s verify:pages-dist`
- `git diff --check` and staged diff check.
