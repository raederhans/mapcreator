# Data Layer System Audit Plan - 2026-05-07

## Goal

Audit the current data foundation for bugs, logic redundancy, architecture gaps, avoidable coupling, and simpler expression opportunities. This is a read-only audit of implementation truth, with findings grounded in current files and line references.

## Scope

- Python build, materialize, publish, manifest, catalog, checkpoint, and contract tooling.
- Frontend runtime data loading, scenario apply, startup hydration, chunk runtime, runtime registry, and data health surfaces.
- Transport workbench data manifests and runtime preview/main-map bridges.
- Existing tests and guardrails that prove or fail to prove these contracts.

## Constraints

- Do not modify production code or checked-in data during the audit.
- Treat uncommitted working-tree changes as current local truth.
- Main thread owns any live tests; child agents perform static analysis only.
- Prefer current live code over old plans or archived reports.

## Acceptance

- Findings are ranked by actual risk and include file/line evidence.
- Each finding distinguishes confirmed bug/risk from cleanup opportunity.
- Final report lists what was audited, what remains uninspected, and the next repair order.
