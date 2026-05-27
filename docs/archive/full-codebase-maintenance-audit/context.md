# Full Codebase Maintenance Audit Context

## 2026-05-27 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-full-codebase-audit`
- Branch: `codex/full-codebase-audit-20260527`
- Base commit: `ed485b0 Stabilize Scenario Forge UI polish after review`
- Main checkout had local runtime noise in `.omx/metrics.json`; it stays outside this worktree.
- Root repo file count from `rg --files`: 3121.
- Live process owner: main thread only.
- Long tests/builds/dev server/browser smoke owner: main thread only.
- Subagent policy: static analysis, docs research, review, and QA planning only until the main thread explicitly assigns a disjoint write scope.

## Initial Known Constraints

- Current project guidance requires `rg --files` or directory listing before precise search.
- `docs/shared/agent-tiers.md` requires THOROUGH review for cross-phase or shared-contract changes.
- `lessons learned.md` emphasizes single source of truth, precise render lifecycle, strict scenario-aware chains, and named test entrypoints.
- Best-practice-execution requires official/upstream research packets before non-trivial code edits.
- Developer note says appearance + transport platformization remains the current main task; shared files are serial integration surfaces.

## Running Findings

- Agent-maintenance tooling: `tools/test_route_registry.mjs` saw top-level npm script targets but missed nested aggregate script leaves. The route registry now resolves recursive npm-script dependencies so named entrypoints can prove the real leaf tests.
- E2E truth source: `tests/e2e/transport_phase_b_main_map_smoke.spec.js` existed on disk but was missing from manifest/list/timeout guardrail metadata. The manifest, generated lists, and timeout allowlist are aligned again at 45 specs.
- Coupling: parent-border appearance controls still bound events in the monolithic toolbar while the list owner already existed. Event binding and style sync now live in `appearance_parent_border_owner.js`, and toolbar contract tests enforce the split.
- DOM injection surface: strategic sidebar and scenario tag color swatches used HTML string assembly for translated or style-bearing UI. Those paths now use `createElement`, `textContent`, `dataset`, style properties, and `replaceChildren`.
- Runtime artifacts: performance benchmark output paths could resolve outside `.runtime`; dev server active metadata could be stale or placed through an unsafe runtime root; browser smoke probes used `/tmp` and interpolated a PowerShell command string. These paths now stay under `.runtime`, use atomic metadata writes, clear only matching server records, and pass Windows launch arguments through a temporary `.ps1`.
- Repository hygiene: four tracked root garbage files were removed after confirming they were not referenced by runtime or tests.
- Local review fix: color swatch DOM reuse signature now includes the translated label, so locale changes rebuild `aria-label` values.

## Verification Log

- Passed: `npm ci`; `npm audit --audit-level=moderate` reported 0 vulnerabilities.
- Passed: `git diff --check`.
- Passed: `node --check` for touched JS modules.
- Passed: `python -m py_compile` for touched Python modules.
- Passed: `node tools/select_verification_targets.mjs --check`.
- Passed: `npm run verify:test:e2e-layers -- --check`.
- Passed: `npm run verify:test-timeout-guardrails -- --check`.
- Passed: `node --test tests/appearance_parent_border_owner_behavior.test.mjs`.
- Passed: targeted Python suite covering toolbar split, strategic sidebar DOM contract, dev workspace normalizers, perf gate contract, E2E structural tooling, and dev-server metadata behavior.
- Passed: Git Bash syntax check for `ops/browser-mcp/run-smoke-browser-inspection.sh`.
- Partial/gap: `node tools/e2e_layering.mjs run-spec tests/e2e/strategic_overlay_sidebar_entry_smoke.spec.js` first produced a trace showing the final `placeButton` assertion completed, then hit Playwright total timeout. Two later reruns hung in Playwright CLI startup with empty stdout/stderr, including a run against an explicit local dev server. No code-level assertion failure was observed.
