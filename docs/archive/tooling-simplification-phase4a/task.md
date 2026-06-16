# Tooling Simplification Phase 4A Task

Date: 2026-06-14

## Goal

Lock the browser smoke inspection profile as a static contract so edits to
`ops/browser-mcp/inspection-profile.toml` fail fast before they reach live
browser smoke execution.

## Scope

- Add a small stdlib Python validator for the inspection profile.
- Extend the existing `tests.test_playwright_app_ready_gate_contract` entry.
- Keep adaptive routing on the static browser smoke route.
- Preserve the live browser smoke shell and Playwright execution path.

## Out Of Scope

- Starting a browser, dev server, Playwright, or browser smoke live run.
- Rewriting `run-smoke-browser-inspection.sh`.
- Adding new npm or Python dependencies.
- Touching the active `codex/tooling-simplification-phase2` worktree.

## Success Criteria

- Checked-in profile validates through the static unittest route.
- Invalid profile structures return contract errors instead of being silently
  defaulted by the shell parser.
- Browser-smoke static support changes select
  `infra:browser-smoke-static-contract`.
- Work is committed, pushed, merged to `main`, verified there, and the phase4A
  worktree is cleaned after integration.
