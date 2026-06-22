# Thematic Real Source WGI v1 Plan

## Goal

Add the first real-source political thematic layer using the World Bank Worldwide Governance Indicators 2025 revision for 2024 admin0 state capacity metrics.

## Scope

- Add a cache-only WGI ingest path for government effectiveness and rule of law.
- Generate checked-in layer assets for `political_wgi_state_capacity_v1`.
- Keep source provenance, build audit, manifest, runtime registry, data manifest, and catalog in sync.
- Use small checked-in fixture rows for tests, with no network dependency.

## Non-goals

- No UI work.
- No map rendering.
- No scenario override or save-format change.
- No topology rewrite.
- No default external download in the builder.

## Acceptance Criteria

- The WGI layer has manifest, admin0 metrics, build audit, and source recipe assets.
- The builder fails clearly when real WGI generation is requested and the source cache is missing.
- Composite score is the mean of government effectiveness and rule of law only when both scores exist.
- Missing source values produce null raw and normalized values with source-gap status.
- Aggregate and unmatched rows are audited without fuzzy name matching.
- Tests prove fixture ingestion, cache-only behavior, contract validation, and catalog/manifest synchronization.
- Required validation commands pass or any remaining gap is explicitly recorded with evidence.

## Work Plan

- [ ] Confirm current worktrees, base commits, and overlap risk.
- [ ] Create WGI ingest module with CSV fixture reader and XLSX cache reader.
- [ ] Extend schemas/contracts for real-source WGI audit fields and partial source gaps.
- [ ] Extend thematic builder to include WGI generation behind an explicit real-source flag and preserve checked-in WGI assets in default runs.
- [ ] Add fixture tests and update existing thematic/catalog/manifest contracts.
- [ ] Generate WGI checked-in assets from the local source cache.
- [ ] Run targeted validation and final QA/review gates.
- [ ] Record delivery package, checkpoint ultragoal stories, commit, integrate, push, archive, and clean.

## Live Process Ownership

Main Codex agent owns all live tests, builds, source-cache generation, catalog generation, Pages dist verification, commits, pushes, and worktree cleanup. Subagents may do static mapping, test design, and final review only.
