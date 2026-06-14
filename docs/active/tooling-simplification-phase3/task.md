# Tooling Simplification Phase 3 Task

## Objective

Reduce adaptive test over-selection for browser smoke tooling changes without changing public commands or live smoke behavior.

## Scope

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase3`
- Branch: `codex/tooling-simplification-phase3`
- Base: `origin/main` at `3d8cd631763b34948589ea66553d2b329efc40ce`
- Owner: main Codex agent
- Live process owner: main Codex agent only
- Child agents: read-only static analysis and review only

## In Scope

- Lock browser smoke routing behavior with golden tests.
- Give `ops/browser-mcp/*` a static browser-smoke verification route that does not select live perf gates.
- Keep existing public scripts and npm command names stable.
- Keep the implementation to selector and route metadata changes.

## Out of Scope

- Rewriting `ops/browser-mcp/run-smoke-browser-inspection.sh`.
- Starting a browser, dev server, Playwright MCP, or live smoke process.
- Changing perf gate runtime behavior.
- Adding npm or Python dependencies.
- Editing Pages dist or scenario data.

## Delivery Package

Record final changed files, verification, branch state, merge state, and cleanup status in `context.md` before closeout.
