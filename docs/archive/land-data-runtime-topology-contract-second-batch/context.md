# context

Implemented runtime topology contract-first repair from the approved plan. Live code remained authoritative.

Main findings and decisions:
- `scenario_apply_pipeline.js` is the state commit boundary; fail-fast belongs in staging before runtime state writes.
- `startup_hydration.js` marks non-blank unrenderable topology as fatal, while blank scenario keeps explicit empty topology valid.
- Runtime identity now comes from source sha metadata, and startup cache identity also includes source sha to prevent stale topology reuse.
- `bundle_loader.js` owns bundle/resource loading; `scenario_manager.js` remains facade/orchestrator.
- Checked-in package strictness and Pages publish boundary now share the same URL/source integrity contract.

Review pass found five gaps; all fixed before final verification.
