# Full Codebase Maintenance Audit

## Outcome

Audit the Scenario Forge codebase for local-optimal changes that harm whole-project architecture, maintainability, performance, functionality, visual quality, testability, or agent-maintenance workflow. Apply focused improvements when the evidence is strong and the change can be verified without expanding scope.

## In Scope

- Current repository architecture and major runtime/data/tooling boundaries.
- Appearance and transport platformization follow-through, with shared files integrated serially.
- Agent-maintenance infrastructure: docs, tests, named scripts, diagnostics, review surfaces, and targeted modification paths.
- Security-oriented static review, especially injection, unsafe DOM writes, shell/path handling, sensitive data, dependency exposure, and runtime artifact boundaries.
- Simplification or decoupling where a smaller implementation preserves behavior and performance.
- Edge-case coverage only after higher-value architecture, tooling, and correctness work.

## Boundaries

- Production code must use real data and real contracts.
- Avoid broad rewrites, new dependencies, and fallback layers without a reproduced failure.
- Keep live tests, dev server, browser smoke, and long builds under main-thread ownership only.
- Subagents may do static analysis, docs research, code review, and test strategy. They must not run or monitor live processes.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are serial integration files.
- Do not edit README unless the task later directly requires it.

## Stop Criteria

- High-confidence findings are either fixed or recorded with a concrete reason.
- Targeted verification covers the touched areas.
- Final self-review plus code-review/security review finds no current-task blockers.
- Docs reflect completed steps and remaining risks.
- Worktree is merged back to `main`, committed with Lore-style trailers, pushed, and cleaned up after successful completion.
