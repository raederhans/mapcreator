# Context

- 2026-05-01: Initial audit found `ui_missing=24`, `uncovered_visible_ui=3`, `a11y_literals=1`.
- The missing locale keys were standard UI copy in sidebar / appearance / frontline / export surfaces, not geo or local-state corruption.
- Static review confirmed local-state override order is still `base -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`, with explicit scenario patch last.
- `tools/translate_manager.py` again showed the known slow no-output path for a small-key sync, so this run used the established fast path: patch source locale data directly, then re-run audit and targeted tests.
- Final audit is clean for the requested focus areas.
