# Ocean Refinement Backlog Plan - 2026-06-02

## Goal

Build the first ocean refinement backlog report for TNO water data:
- Identify low-precision ocean and sea candidates.
- Identify high-vertex macro seas that should drive child-water split review.
- Identify existing child-covered high-vertex seas for performance-triggered simplification review only.
- Identify macro-only water families and missing child-detail coverage.
- Surface provenance and source consistency gaps.
- Keep geometry edits gated by public/source-backed evidence and validators.

## Acceptance Criteria

- Audit output has stable schema fields for precision, child coverage, provenance/source, and action recommendation.
- Current candidate list is generated from checked-in data, not manual guesses.
- Tests lock the report schema and candidate classification behavior.
- Generated reports stay under `.runtime/reports/generated/`.
- No water geometry coordinates are changed in this phase unless source evidence proves a replacement is safer.
- Verification records exact commands and results.

## Execution Rules

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-backlog-audit-20260602`
- Branch: `codex/ocean-backlog-audit-20260602`
- Live process owner: main agent only.
- Subagents: read-only mapping and review lanes only.
- Data edits must follow `data/AGENTS.md` if this phase touches data files.

## Plan

1. Map current water data generation, provenance, and tests.
2. Extend `tools/audit_tno_water_family_refinement.py` into backlog/audit v1.
3. Add stable fields for precision band, high-vertex split review, source family, child coverage, and recommendation.
4. Add targeted tests using fixture data.
5. Run audit script and water validators.
6. Review whether any geometry edit is justified by evidence.
7. Archive the active notes when complete.
8. Merge, commit, push, and clean the worktree.
