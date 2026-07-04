# SF-ATS WP2 Context

## 2026-07-02 Setup

- Created isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-sfats-wp2`.
- Branch: `codex/sf-ats-wp2-dossier-plan-20260702`.
- Base branch: `codex/sf-ats-wp1-5-route-coverage-20260702`.
- Base commit: `33fea78ecb7f9160c2b528cad53ddef1d2696fc6`.
- Parent checkout `main` is dirty and behind origin; WP2 work happens only in this isolated worktree.
- Loaded skills: `ultragoal`, `ultraqa`, `ultrawork`, `research-before-fix`.
- `ultrawork` referenced `references/agent-tiers.md`, but that file is missing in the installed skill folder; fallback is direct execution plus bounded review lanes when useful.
- Created `.omx/ultragoal` plan with goals for dossier, plan, Markdown, and optional child-safe execution.

## Preflight Evidence

- `node tools/select_verification_targets.mjs --changed-file AGENTS.md --json`: exit 0, routes to `verify:supervisor-contracts`, no unmatched files.
- `node tools/select_verification_targets.mjs --changed-file docs/testing/sf-ats-overview.md --json`: exit 0, routes to `verify:supervisor-contracts`, no unmatched files.
- `node tools/select_verification_targets.mjs --changed-file tools/ai_test_supervisor/domain_registry.json --json`: exit 0, routes to `verify:supervisor-contracts`, no unmatched files.
- `node tools/select_verification_targets.mjs --changed-file tests/supervisor_domain_registry_behavior.test.mjs --json`: exit 0, routes to `verify:supervisor-contracts` plus direct supervisor checks, no unmatched files.

## Implementation Notes

- `tools/run_adaptive_tests.mjs` already exports `discoverChangedFiles` and `buildExecutionPlan`.
- `tools/run_adaptive_tests.mjs` contains a private `commandToProcess`; WP2 should export it so the supervisor does not duplicate command resolution.
- `tools/select_verification_targets.mjs` exports `buildRecommendation`, which WP2 will reuse for selector reports.
- Existing schemas require extension because WP2 adds `requiredArtifacts`, lane summary, route gap severity, execution results, and `critical` risk.

## Current Status

- WP2 implementation and validation passed.
- Added lane classification, change dossier builder, Markdown renderer, supervisor runner, package entries, schema extensions, route coverage for active/archive supervisor docs, and focused behavior tests.
- Final adaptive dry-run reported `unmatched: []`, 150 recommended commands, 4 main-thread browser/dev commands held out by lane ownership, and no CI-only commands.
- Final supervisor plan for WP2 runner/test files reported `riskLevel=medium`, no route gaps, child-safe commands `node tools/select_verification_targets.mjs --check`, `test:node:supervisor-plan`, and `verify:supervisor-contracts`.
- Browser, Playwright, perf, dist, heavy-geo, scenario-data, and checkpoint-builder lanes were not claimed.

## Validation Evidence

- `node --check tools/ai_test_supervisor/command_lanes.mjs`: exit 0.
- `node --check tools/ai_test_supervisor/build_change_dossier.mjs`: exit 0.
- `node --check tools/ai_test_supervisor/render_supervisor_markdown.mjs`: exit 0.
- `node --check tools/ai_test_supervisor/supervise_adaptive_verification.mjs`: exit 0.
- `npm run verify:supervisor-contracts`: exit 0, 12 supervisor contract tests and 3 routing tests passed.
- `npm run test:node:supervisor-plan`: exit 0, 12 WP2 behavior tests passed.
- `node tools/ai_test_supervisor/supervise_adaptive_verification.mjs --changed-file AGENTS.md`: exit 0.
- `npm run verify:supervisor-plan`: exit 0.
- `npm run test:adaptive`: exit 0, dry-run only.
- `npm run verify:architecture-boundaries`: exit 0.
