# Transport panel systematic audit context

- Started 2026-04-30.
- User requested `$systematic-debugging $ultrawork $security-review` for the entire transport panel.
- Existing working tree was dirty. Unrelated edits in `.omx`, app-performance docs, scenario/main/sidebar/controller comments, perf scripts, and prior global airport/port work were preserved.
- Relevant lessons: transport visibility needs loader allowlist + renderer rank gate + live visibility evidence; Pages uses explicit runtime allowlist; transport global scope needs loader + publish allowlist + generation source aligned.
- Relevant memory: transport workbench point preview should reuse manifest -> pack -> snapshot -> overlay; dense/browser validation should prefer Node/manifest audits over fragile browser smoke; coverage tier should have one truth source.

## Current uncertainty
- The phrase “整个 transport 面板” covers both toolbar transport overview and transport workbench. This audit treated both as in scope, while keeping fixes to confirmed defects.
- Security risk is mostly local file/data integrity and DOM/URL handling because this is a static browser app.

## 2026-04-30 execution notes
- Static audit confirmed the workbench preview path and main transport overview path are separate: workbench preview still uses Japan packs by design; global airport/port coverage is handled by loader/published global packs from the prior fix.
- Found a real manifest-boundary bug: point, line, and industrial preview loaders could continue to `fetch(packPath)` when the manifest path resolved to an empty string. In a browser this can request the current document and then fail later with a misleading JSON/load error.
- Fixed the boundary by failing early with explicit missing pack path errors before fetch.
- Removed two stale mojibake commented descriptor blocks from the transport workbench descriptor. Active descriptor strings stayed unchanged.
- Security sweep found no transport-specific HTML injection in the inspected workbench files; `npm audit --audit-level=moderate` returned 0 vulnerabilities.

## Verification evidence
- `node --check` passed for changed transport preview/runtime/controller/descriptor files.
- `python tools/check_transport_workbench_manifests.py --root data/transport_layers` passed for checked-in transport manifests.
- `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_manifest_contracts tests.test_ui_rework_plan03_support_transport_contract -q` passed: 19 tests.
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_map_renderer_asset_url_and_facility_surface_contract tests.test_transport_facility_interactions_contract tests.test_transport_manifest_contracts tests.test_transport_workbench_manifest_runtime_contract tests.test_ui_rework_plan03_support_transport_contract -q` passed: 84 tests.
- `npm audit --audit-level=moderate` passed: found 0 vulnerabilities.

## Final self-review
- Rechecked first principles: transport panel correctness depends on explicit manifest paths, safe text rendering, and stable data contracts. The simplest robust fix is fail-fast at pack path resolution plus contract coverage.
- Reviewer subagent was closed after timeout; main-thread review found no additional simpler fix.
- `git diff --check` passed for changed files; transport workbench injection scan found no `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, or `javascript:` in transport workbench files.
