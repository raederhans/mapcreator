# Tooling Simplification Phase 3 Context

## 2026-06-14

- Main checkout was clean before creating this worktree.
- Created `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase3` from `origin/main` at `3d8cd631763b34948589ea66553d2b329efc40ce`.
- Existing unrelated worktrees were left untouched, including active data-chain, data-quality, audit, HOI4, and render-chain worktrees.
- Relevant lesson: perf gate reuse must verify server identity; browser-smoke static checks should not accidentally route through broad live perf gates.
- Current route state:
  - `infra:browser-smoke-static-contract` exists and runs `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
  - Its initial domain was `perf`.
  - `select_verification_targets.mjs` initially mapped `ops/browser-mcp/*` to `route.domain === "perf"`.
- Phase 3 target: create a narrow `browser-smoke` routing domain and lock it with golden tests.

## Owner Map

- Main agent owns edits and all live commands.
- Read-only subagents may inspect selector/registry/script boundaries and report risks.

## Findings

- `ops/browser-mcp/*` previously routed to every `perf` domain route. This selected static smoke contracts and live perf gates together.
- The first route split used a directory-level `ops/browser-mcp/` check. Read-only review found this still mixed smoke support files with `ops/browser-mcp/editor-performance-benchmark.py`.
- The stable phase3 boundary is an explicit browser-smoke support file set:
  - `ops/browser-mcp/run-smoke-browser-inspection.sh`
  - `ops/browser-mcp/inspection-profile.toml`
  - `ops/browser-mcp/inspection-profile.schema.md`
- Read-only browser-smoke review confirmed phase3 should keep the shell script intact, lock static routing, and defer profile/schema validator plus shell helper extraction to a later phase.

## Implemented

- `infra:browser-smoke-static-contract` now uses `domain: "browser-smoke"`.
- `select_verification_targets.mjs` now maps the explicit browser-smoke support file set to `infra:browser-smoke-static-contract`.
- `select_verification_targets.mjs` keeps `ops/browser-mcp/editor-performance-benchmark.py` in perf routing through an explicit perf support file set.
- The adaptive routing golden case now includes `inspection-profile.schema.md`, requires an exact single command, and locks child-safe/no-lock/no-main-thread behavior.
- The route registry structural test now locks the browser smoke route as `browser-smoke`, `child-safe`, fast, and lock-free.

## Validation Log

- 2026-06-14: Targeted golden test failed before implementation because browser smoke changes selected live perf gate routes.
- 2026-06-14: Targeted golden test passed after the route split.
- 2026-06-14: Direct selector JSON for browser smoke script/profile/schema selected only `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling -q` passed after lockfile dependency install.
- 2026-06-14: `python -m unittest tests.test_playwright_app_ready_gate_contract -q` passed.
- 2026-06-14: `node tools/select_verification_targets.mjs --check` passed.
- 2026-06-14: `npm run test:adaptive -- --dry-run` passed.

## Delivery Package

1. Changed scope: browser-smoke static route split from live perf routing; exact adaptive golden assertions; active docs and registry updates.
2. Core files: `tools/select_verification_targets.mjs`, `tools/test_route_registry.mjs`, `tests/test_e2e_structural_tooling.py`.
3. Docs/files: `docs/active/tooling-simplification-phase3/{task,plan,context}.md`, `docs/active/_worktree_registry.md`, `lessons learned.md`; local ignored snapshot at `.omx/context/tooling-simplification-phase3-20260614T230531Z.md`.
4. Diff summary: the static browser-smoke route domain is now `browser-smoke`; selector uses explicit smoke/perf support file sets; tests assert exact static command, exact owner, empty locks, and empty main-thread queue.
5. Commit state: pending until final verification and staging.
6. Main divergence: branch was created from `origin/main` `3d8cd631`; re-check remote before merge.
7. Conflict risk: file-path overlap is limited to tooling/test docs. Semantic overlap is test-routing only.
8. Verification: structural unittest, browser smoke static contract, selector schema, direct selector outputs, adaptive dry-run, and diff check passed.
9. Remaining risk: live browser smoke process and shell helper extraction remain deferred by design.
10. Recommended next step: commit, push, fast-forward merge to `main`, verify on `main`, push `main`, then remove the phase3 worktree.

## Deferred Follow-Up

- Add a static profile/schema validator that checks required fields, mode values, budget relationships, output roots, and section/gesture membership.
- Extract shell TOML parsing, mode filtering, and report summarizing into unit-testable helpers while keeping the shell script as the process wrapper.
- Run live quick/full browser smoke in a separate phase with one explicit owner.
