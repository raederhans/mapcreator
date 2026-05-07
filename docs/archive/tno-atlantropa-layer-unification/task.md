# TNO 1962 Atlantropa Layer Unification Task

## Checklist

- [x] Read AGENTS instructions and project lessons.
- [x] Confirm baseline dirty work and avoid touching unrelated files.
- [x] Create context snapshot and active docs.
- [x] Deploy parallel child agents.
- [x] Patch builder schema and metadata generation.
- [x] Patch strict contracts.
- [x] Patch runtime loader/state/startup.
- [x] Patch renderer/color/spatial interaction.
- [x] Patch tests.
- [x] Regenerate assets. Full rebuild was stopped during runtime topology OOM risk; completed memory-light topology split plus downstream chunk/startup regeneration.
- [x] Remove old ATLSEA projection compatibility path and restore political chunk budget to 6.
- [x] Verify. Strict contract, scenario chunk contract test, Python chunk asset tests, Python TNO bundle builder tests, py_compile, node --check, and git diff --check all passed.
- [x] Final review and lessons update. Static review is delegated to a child agent; parent self-check found no new blocker after verification.

## Known Unrelated Dirty Work

- `.omx/metrics.json`
- `docs/active/localization-automation-2026-05-07/`
