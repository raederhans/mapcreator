# Tooling Simplification Phase 2 Task

## Objective

Simplify the validation and agent-assistance tooling chain without reducing behavior.

## Phase Boundary

- Primary lane: `tools/check_scenario_contracts.py --write-safe`.
- Secondary lane: browser smoke and agent-assistance routing discovery.
- Public commands stay stable.
- No new dependency is planned for this phase.

## Out of Scope

- Scenario data rebuilds beyond behavior-lock fixtures.
- Broad browser smoke rewrite.
- Agent entrypoint redesign.
- Pages dist edits unless a touched contract requires them.
