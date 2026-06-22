# WGI Real-source QA Fix Plan

## Goal

Recover the WGI real-source integration against current repo truth, then close the QA gaps found in the source-cache layer without starting thematic rendering or save-format work.

## Scope

- Preserve source-cache-only WGI ingestion.
- Preserve WGI official dimensions as Government Effectiveness and Rule of Law.
- Preserve WGI uncertainty fields when the source cache provides them.
- Label the composite as a project-defined state-capacity proxy.
- Keep missing values as null with source_gap or partial_source_gap status.
- Keep the layer catalog-only and default hidden.

## Non-goals

- No network download.
- No thematic canvas rendering.
- No scenario save-format change.
- No default visible thematic layer.
- No NoData-as-0 conversion.

## Steps

- [x] Establish a clean QA fix worktree from current `origin/main`.
- [x] Confirm the old WGI recovery worktree is absent and main contains unrelated local docs/lessons traces.
- [x] Inspect the local WGI source cache headers for uncertainty fields.
- [x] Patch ingestion, contracts, tests, and builder wording.
- [x] Regenerate WGI/thematic/data catalog outputs from the local cache.
- [x] Run targeted Python, Node, catalog, architecture, and Pages verification.
- [x] Run final review/self-check and record the delivery package.
- [x] Commit and prepare fast-forward integration according to current main/origin state.
